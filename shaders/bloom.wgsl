@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var source: texture_2d<f32>;
@group(0) @binding(3) var destination: texture_storage_2d<rgba16float, write>;

const WEIGHTS = array<f32, 5>(0.227027, 0.194595, 0.121622, 0.054054, 0.016216);

fn sampleLight(uv: vec2f, extract: bool) -> vec3f {
  let color = textureSampleLevel(source, linearSampler, uv, 0.0).rgb;
  return select(color, max(color - vec3f(0.91), vec3f(0.0)), extract);
}

fn blur(p: vec2u, horizontal: bool) {
  let size = textureDimensions(destination);
  if (any(p >= size)) { return; }
  let uv = (vec2f(p) + 0.5) / vec2f(size);
  let axis = select(vec2f(0.0, 2.0), vec2f(2.0, 0.0), horizontal) / vec2f(size);
  var color = sampleLight(uv, horizontal) * WEIGHTS[0];
  for (var i = 1u; i < 5u; i++) {
    color += (sampleLight(uv + axis * f32(i), horizontal)
            + sampleLight(uv - axis * f32(i), horizontal)) * WEIGHTS[i];
  }
  textureStore(destination, p, vec4f(color, 1.0));
}

@compute @workgroup_size(8, 8)
fn horizontal(@builtin(global_invocation_id) id: vec3u) { blur(id.xy, true); }

@compute @workgroup_size(8, 8)
fn vertical(@builtin(global_invocation_id) id: vec3u) { blur(id.xy, false); }
