async function source(name) {
  const response = await fetch(new URL(`../shaders/${name}.wgsl`, import.meta.url), {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Could not load ${name} shader (${response.status})`);
  return response.text();
}

export async function createWebGPU(canvas, mask, onFailure) {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "low-power" });
  if (!adapter || adapter.info?.isFallbackAdapter) throw new Error("No hardware WebGPU adapter");
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  if (!context) { device.destroy(); throw new Error("No WebGPU canvas"); }
  let disposed = false;
  let failed = false;
  const textures = [];
  const targets = [];
  const fail = error => {
    if (disposed || failed) return;
    failed = true;
    onFailure(error);
  };
  device.lost.then(info => { if (info.reason !== "destroyed") fail(new Error(info.message)); });
  device.addEventListener("uncapturederror", event => {
    event.preventDefault();
    fail(event.error);
  });

  try {
    const [common, sceneCode, bloomCode, postCode] = await Promise.all(
      ["common", "landscape", "bloom", "composite"].map(source),
    );
    const module = async (label, code) => {
      const shader = device.createShaderModule({ label, code: common + code });
      const info = await shader.getCompilationInfo();
      const errors = info.messages.filter(message => message.type === "error");
      if (errors.length) throw new Error(`${label}: ${errors.map(e => `${e.lineNum}:${e.linePos} ${e.message}`).join("\n")}`);
      return shader;
    };
    const [scene, bloom, post] = await Promise.all([
      module("Landscape", sceneCode),
      module("Bloom", bloomCode), module("Composite", postCode),
    ]);
    const uniform = device.createBuffer({ size: 128, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    const compute = GPUShaderStage.COMPUTE;
    const fragment = GPUShaderStage.FRAGMENT;
    const uniformEntry = visibility => ({ binding: 0, visibility, buffer: { type: "uniform" } });
    const sampleEntry = (binding, visibility) => ({ binding, visibility, texture: { sampleType: "float" } });
    const samplerEntry = visibility => ({ binding: 1, visibility, sampler: { type: "filtering" } });
    const storageEntry = binding => ({ binding, visibility: compute, storageTexture: { access: "write-only", format: "rgba16float" } });
    const paintLayout = device.createBindGroupLayout({ entries: [uniformEntry(fragment), samplerEntry(fragment), sampleEntry(2, fragment)] });
    const postLayout = device.createBindGroupLayout({ entries: [uniformEntry(fragment), samplerEntry(fragment), sampleEntry(2, fragment), sampleEntry(3, fragment)] });
    const bloomLayout = device.createBindGroupLayout({ entries: [uniformEntry(compute), samplerEntry(compute), sampleEntry(2, compute), storageEntry(3)] });
    const layout = bindGroupLayout => device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque", colorSpace: "srgb" });
    const [scenePipeline, horizontalPipeline, verticalPipeline, postPipeline] = await Promise.all([
      device.createRenderPipelineAsync({ label: "Paint landscape", layout: layout(paintLayout), vertex: { module: scene, entryPoint: "vertex" }, fragment: { module: scene, entryPoint: "landscape", targets: [{ format: "rgba16float" }] } }),
      device.createComputePipelineAsync({ label: "Extract and diffuse light", layout: layout(bloomLayout), compute: { module: bloom, entryPoint: "horizontal" } }),
      device.createComputePipelineAsync({ label: "Diffuse light vertically", layout: layout(bloomLayout), compute: { module: bloom, entryPoint: "vertical" } }),
      device.createRenderPipelineAsync({ label: "Develop painting", layout: layout(postLayout), vertex: { module: post, entryPoint: "vertex" }, fragment: { module: post, entryPoint: "composite", targets: [{ format }] } }),
    ]);
    const texture = (size, format, usage, list = textures) => {
      const result = device.createTexture({ size, format, usage });
      list.push(result);
      return result;
    };
    const maskTexture = texture([mask.width, mask.height], "rgba8unorm", GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT);
    device.queue.copyExternalImageToTexture({ source: mask }, { texture: maskTexture }, [mask.width, mask.height]);
    const bind = (bindGroupLayout, resources) => device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{ binding: 0, resource: { buffer: uniform } }, ...resources.map((resource, i) => ({ binding: i + 1, resource }))],
    });
    const sceneGroup = bind(paintLayout, [sampler, maskTexture.createView()]);
    let sceneTexture, postGroup, horizontalGroup, verticalGroup;
    let width = 0, height = 0, bloomWidth = 0, bloomHeight = 0;

    function resize(w, h) {
      if (w === width && h === height) return;
      width = w; height = h;
      canvas.width = w; canvas.height = h;
      for (const target of targets.splice(0)) target.destroy();
      sceneTexture = texture([w, h], "rgba16float", GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, targets);
      bloomWidth = Math.max(1, Math.ceil(w / 4));
      bloomHeight = Math.max(1, Math.ceil(h / 4));
      const a = texture([bloomWidth, bloomHeight], "rgba16float", GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING, targets);
      const b = texture([bloomWidth, bloomHeight], "rgba16float", GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING, targets);
      horizontalGroup = bind(bloomLayout, [sampler, sceneTexture.createView(), a.createView()]);
      verticalGroup = bind(bloomLayout, [sampler, a.createView(), b.createView()]);
      postGroup = bind(postLayout, [sampler, sceneTexture.createView(), b.createView()]);
    }

    function draw(values) {
      if (disposed || failed || !width) return;
      device.queue.writeBuffer(uniform, 0, values);
      const encoder = device.createCommandEncoder();
      const render = (pipeline, group, view) => {
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: "clear", storeOp: "store", clearValue: [0, 0, 0, 1] }] });
        pass.setPipeline(pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end();
      };
      render(scenePipeline, sceneGroup, sceneTexture.createView());
      for (const [pipeline, group] of [[horizontalPipeline, horizontalGroup], [verticalPipeline, verticalGroup]]) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline); pass.setBindGroup(0, group);
        pass.dispatchWorkgroups(Math.ceil(bloomWidth / 8), Math.ceil(bloomHeight / 8)); pass.end();
      }
      render(postPipeline, postGroup, context.getCurrentTexture().createView());
      device.queue.submit([encoder.finish()]);
    }

    return {
      backend: "webgpu", resize, draw,
      dispose() {
        disposed = true;
        for (const target of [...targets, ...textures]) target.destroy();
        uniform.destroy(); context.unconfigure(); device.destroy();
      },
    };
  } catch (error) {
    disposed = true;
    context.unconfigure(); device.destroy();
    throw error;
  }
}
