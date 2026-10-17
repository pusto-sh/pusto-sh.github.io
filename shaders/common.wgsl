struct Uniforms {
  frame: vec4f,
  view: vec4f, // CSS width/height, scene scale x/y.
  pointer: vec4f,
  interaction: vec4f,
  pulses: array<vec4f, 4>,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

const WORLD = vec2f(1536.0, 1024.0);
const CENTER = vec2f(1168.0, 437.0);

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vertex(@builtin(vertex_index) index: u32) -> VertexOutput {
  let p = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  var out: VertexOutput;
  out.position = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(p.x, 1.0 - p.y);
  return out;
}

fn worldPoint(uv: vec2f) -> vec2f {
  let size = WORLD * u.view.zw;
  let offset = (u.view.xy - size) * 0.5;
  return (uv * u.view.xy - offset) / u.view.zw;
}

fn brushScale() -> f32 {
  return min(u.view.w / u.view.z, 1.5);
}

fn brushPoint(point: vec2f) -> vec2f {
  // Uniform sampling for sky, brush, and waves; layout coordinates still position the terrain.
  return CENTER + (point - CENTER) * u.view.zw / (u.view.z * brushScale());
}

fn groundPoint(point: vec2f) -> vec2f {
  // Pin the horizon while keeping terrain units square on portrait screens.
  return vec2f(point.x, 780.0 + (point.y - 780.0) * u.view.w / u.view.z);
}

fn hash(p: vec2f) -> f32 {
  var q = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let s = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1.0, 0.0)), s.x),
             mix(hash(i + vec2f(0.0, 1.0)), hash(i + 1.0), s.x), s.y);
}

fn fbm(p: vec2f) -> f32 {
  return noise(p) * 0.57 + noise(p * 2.03 + 19.7) * 0.28
       + noise(p * 4.11 + 41.3) * 0.15;
}

fn bell(x: f32, width: f32) -> f32 {
  return exp(-x * x / (width * width));
}

fn iridescence(phase: f32) -> vec3f {
  return vec3f(0.59, 0.54, 0.55)
    + vec3f(0.37, 0.34, 0.34) * cos(6.283185 * (phase + vec3f(0.0, 0.28, 0.54)));
}

// Returns xy displacement, z warmth, and w signed light modulation.
fn warmWave(scenePoint: vec2f) -> vec4f {
  let point = brushPoint(scenePoint);
  let local = point - CENTER;
  let radius = length(local);
  if (radius <= 120.0 || u.interaction.z == 0.0) { return vec4f(0.0); }
  let radial = local / radius;
  let tangent = vec2f(-radial.y, radial.x);
  let shape = dot(radial, vec2f(0.065, -0.04))
    + (noise(point * 0.0035) - 0.5) * 0.08;
  let distance = radius * (1.0 + shape);
  let curl = (noise(point * 0.004 + 29.0) - 0.5) * 0.35;
  var displacement = vec2f(0.0);
  var light = 0.0;
  var depth = 0.0;
  for (var i = 0u; i < 4u; i++) {
    let age = u.frame.z - u.pulses[i].x;
    if (age >= 0.0 && age < 7.5) {
      // Critically damped step response.
      let springTime = age * 1.05;
      let travel = 1.0 - (1.0 + springTime) * exp(-springTime);
      let front = 132.0 + travel * 1560.0;
      let delta = distance - front;
      let span = mix(230.0 + travel * 140.0, 115.0 + travel * 100.0,
        smoothstep(-90.0, 110.0, delta));
      let body = bell(delta, span);
      let recovery = bell(delta + span * 1.15, span * 0.82) * 0.12;
      let envelope = smoothstep(0.0, 0.22, age) * exp(-age * 0.28)
        * (1.0 - smoothstep(5.0, 7.5, age)) * u.pulses[i].y;
      displacement -= (radial + tangent * curl) * (body - recovery) * envelope * 62.0;
      light += body * envelope;
      depth += clamp(delta / span, -1.0, 1.0) * body * envelope;
    }
  }
  let outside = smoothstep(120.0, 190.0, radius);
  displacement *= outside;
  displacement *= min(1.0, 140.0 / max(length(displacement), 0.001));
  return vec4f(displacement, min(light, 1.8) * outside,
    clamp(depth, -0.8, 0.8) * outside);
}
