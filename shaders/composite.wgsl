@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var painting: texture_2d<f32>;
@group(0) @binding(3) var bloom: texture_2d<f32>;

@fragment fn composite(in: VertexOutput) -> @location(0) vec4f {
  let p = worldPoint(in.uv);
  let delta = (p - CENTER) / WORLD.y;
  let painted = textureSampleLevel(painting, linearSampler, in.uv, 0.0);
  let atmosphere = 1.0 - painted.a;
  let chroma = (0.3 + u.pointer.w * 2.2)
    * (0.25 + 0.75 * exp(-dot(delta, delta) * 3.0)) * u.interaction.z * atmosphere;
  let split = normalize(delta + vec2f(0.0001)) * chroma / u.frame.xy;
  let red = textureSampleLevel(painting, linearSampler, in.uv + split, 0.0).r;
  let blue = textureSampleLevel(painting, linearSampler, in.uv - split, 0.0).b;
  var color = vec3f(red, painted.g, blue);
  color += textureSampleLevel(bloom, linearSampler, in.uv, 0.0).rgb * 0.65 * atmosphere;
  // Scale RGB together during highlight roll-off to preserve hue.
  let peak = max(color.r, max(color.g, color.b));
  let shoulder = 0.94 + 0.06 * (1.0 - exp(-max(peak - 0.94, 0.0) / 0.06));
  color *= min(1.0, shoulder / max(peak, 0.0001));
  let vignette = dot(in.uv - 0.5, in.uv - 0.5);
  color *= 1.0 - vignette * 0.07;
  let skyGrain = hash(in.position.xy + fract(u.frame.z * 0.07 * u.interaction.z) * 73.0) - 0.5;
  let landGrain = (hash(p * 1.7 + 83.2) - 0.5) * 0.45;
  color += mix(landGrain, skyGrain, atmosphere) / 255.0;
  return vec4f(color, 1.0);
}
