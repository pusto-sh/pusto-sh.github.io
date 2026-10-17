const vertexSource = `#version 300 es
out vec2 uv;
void main() {
  vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
  gl_Position=vec4(p*2.-1.,0.,1.);
  uv=vec2(p.x,1.-p.y);
}`;

export async function createWebGL(canvas, mask, onFailure) {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) throw new Error("No WebGL2 context");
  const shaders = [];
  let disposed = false;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  const vao = gl.createVertexArray();
  const dispose = () => {
    disposed = true;
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program); gl.deleteBuffer(buffer); gl.deleteTexture(texture); gl.deleteVertexArray(vao);
  };
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    if (!disposed) onFailure(new Error("WebGL context lost"));
  });
  try {
    const response = await fetch(new URL("../shaders/fallback.frag", import.meta.url), { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Could not load fallback shader (${response.status})`);
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, await response.text()));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 128, gl.DYNAMIC_DRAW);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, "Uniforms"), 0);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, buffer);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    gl.uniform1i(gl.getUniformLocation(program, "brush"), 0);
    return {
      backend: "webgl2",
      resize(width, height) {
        canvas.width = width; canvas.height = height;
        gl.viewport(0, 0, width, height);
      },
      draw(values) {
        if (disposed || gl.isContextLost()) return;
        gl.bindBuffer(gl.UNIFORM_BUFFER, buffer); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, values);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
