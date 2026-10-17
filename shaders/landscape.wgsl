@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var brush: texture_2d<f32>;

// Cubic Bezier heights; evenly spaced x controls also match the SVG fallback.
const REAR = vec4f(786.0, 710.0, 814.0, 782.0);
const FRONT = vec4f(820.0, 830.0, 790.0, 817.0);

fn hill(x: f32, front: bool) -> f32 {
  let t = clamp(x / WORLD.x, 0.0, 1.0);
  let s = 1.0 - t;
  return dot(select(REAR, FRONT, front), vec4f(s * s * s, 3.0 * s * s * t,
    3.0 * s * t * t, t * t * t));
}

fn skyIllumination(time: f32) -> vec3f {
  // Exclude interaction when sampling ambient sky color for the ground.
  let anchor = vec2f(1040.0, 620.0);
  let air = fbm(anchor * 0.0035 + vec2f(time * 0.018, -time * 0.009));
  let flow = fbm(anchor * 0.0024 + vec2f(air * 1.6, -air * 1.2)
    + vec2f(time * 0.018, -time * 0.011));
  let distance = length((anchor - CENTER) * vec2f(1.0, 0.86));
  let phase = distance * 0.0046 + flow * 3.6 - time * 0.12;
  return iridescence(phase * 0.16 - time * 0.008);
}

fn groundIllumination(time: f32) -> vec3f {
  // Delayed temporal average of the ambient sky color.
  let hue = skyIllumination(time - 8.0) * 0.25 + skyIllumination(time - 21.0) * 0.5
    + skyIllumination(time - 34.0) * 0.25;
  return (hue - vec3f(0.59, 0.54, 0.55)) * 0.012;
}

fn mineralNoise(p: vec2f) -> f32 {
  // Rotated octaves avoid the square lattice of a single noise field.
  var q = p;
  var value = noise(q) * 0.53;
  q = vec2f(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) * 2.07 + 13.9;
  value += noise(q) * 0.27;
  q = vec2f(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) * 2.11 + 31.7;
  value += noise(q) * 0.13;
  q = vec2f(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) * 2.03 + 7.3;
  return value + noise(q) * 0.07;
}

const WASH_SAGE = array<vec2f, 8>(
  vec2f(-220.0, 9.0), vec2f(85.0, 15.0),
  vec2f(243.0, 46.0), vec2f(457.0, 64.0),
  vec2f(405.0, 108.0), vec2f(170.0, 128.0),
  vec2f(-45.0, 115.0), vec2f(-220.0, 75.0));
const WASH_STONE = array<vec2f, 8>(
  vec2f(306.0, -16.0), vec2f(597.0, -9.0),
  vec2f(813.0, 17.0), vec2f(1086.0, 22.0),
  vec2f(1160.0, 64.0), vec2f(941.0, 107.0),
  vec2f(668.0, 117.0), vec2f(402.0, 80.0));
const WASH_EAST = array<vec2f, 8>(
  vec2f(1024.0, 24.0), vec2f(1202.0, 3.0),
  vec2f(1412.0, 23.0), vec2f(1700.0, 9.0),
  vec2f(1710.0, 168.0), vec2f(1471.0, 191.0),
  vec2f(1239.0, 129.0), vec2f(1110.0, 78.0));
const WASH_SAGE_POOL = array<vec2f, 8>(
  vec2f(-120.0, 91.0), vec2f(70.0, 72.0),
  vec2f(201.0, 81.0), vec2f(343.0, 125.0),
  vec2f(282.0, 174.0), vec2f(117.0, 198.0),
  vec2f(-18.0, 177.0), vec2f(-120.0, 135.0));
const WASH_STONE_POOL = array<vec2f, 8>(
  vec2f(396.0, 118.0), vec2f(572.0, 88.0),
  vec2f(670.0, 95.0), vec2f(791.0, 154.0),
  vec2f(951.0, 180.0), vec2f(867.0, 264.0),
  vec2f(604.0, 271.0), vec2f(422.0, 211.0));
const WASH_EAST_POOL = array<vec2f, 8>(
  vec2f(1155.0, 71.0), vec2f(1240.0, 48.0),
  vec2f(1300.0, 39.0), vec2f(1399.0, 65.0),
  vec2f(1512.0, 77.0), vec2f(1465.0, 111.0),
  vec2f(1321.0, 122.0), vec2f(1190.0, 97.0));
const WASH_CHALK = array<vec2f, 8>(
  vec2f(809.0, 106.0), vec2f(963.0, 82.0),
  vec2f(1094.0, 91.0), vec2f(1216.0, 119.0),
  vec2f(1198.0, 161.0), vec2f(1050.0, 177.0),
  vec2f(951.0, 155.0), vec2f(866.0, 166.0));

fn washDistance(p: vec2f, points: array<vec2f, 8>) -> f32 {
  var closest = 1.0e9;
  var inside = false;
  for (var i = 0u; i < 8u; i++) {
    let a = points[i];
    let b = points[(i + 1u) % 8u];
    let edge = b - a;
    let relative = p - a;
    let nearest = relative - edge * clamp(dot(relative, edge) / dot(edge, edge), 0.0, 1.0);
    closest = min(closest, dot(nearest, nearest));
    if ((a.y > p.y) != (b.y > p.y)) {
      let crossing = a.x + (p.y - a.y) * (b.x - a.x) / (b.y - a.y);
      if (p.x < crossing) { inside = !inside; }
    }
  }
  return select(sqrt(closest), -sqrt(closest), inside);
}

fn pigmentWash(distance: f32, settling: f32, tint: vec3f, seed: f32, time: f32) -> vec3f {
  let wetEdge = 1.0 - smoothstep(-1.8, 3.2, distance);
  let feather = 1.0 - smoothstep(-18.0, 22.0, distance);
  let absorption = smoothstep(0.28, 0.70, settling);
  let coverage = mix(wetEdge, feather, 0.35 + absorption * 0.50);
  let pooled = bell(distance + 0.8, 2.1) * smoothstep(0.48, 0.68, settling);
  // Animate density and hue only; mask and grain coordinates stay fixed.
  let density = 1.0 + 0.085 * sin(time * 6.283185 / (139.0 + seed * 37.0) + seed * 2.3)
    + 0.035 * sin(time * 6.283185 / (179.0 + seed * 23.0) + seed * 4.1);
  let temperature = sin(time * 6.283185 / (167.0 + seed * 29.0) + seed * 3.2);
  let pigment = tint * (0.57 + absorption * 0.78) * density;
  return coverage * (pigment + vec3f(0.0012, 0.0002, -0.0010) * temperature)
    - vec3f(0.0045, 0.0041, 0.0032) * pooled * density;
}

fn mineralWashes(point: vec2f, depth: f32, near: bool, time: f32) -> vec3f {
  let paper = vec2f(point.x, depth) + select(vec2f(73.0, 48.0), vec2f(0.0), near);
  let offset = select(19.7, 0.0, near);
  let broad = vec2f(mineralNoise(paper * vec2f(0.006, 0.019) + offset + 8.2),
    mineralNoise(paper * vec2f(0.008, 0.024) + offset + 37.6)) - 0.5;
  let edgeNoise = mineralNoise(paper * vec2f(0.072, 0.16) + offset + 52.3) - 0.5;
  let p = paper + broad * vec2f(140.0, 64.0);
  let ragged = edgeNoise * 6.0 + (noise(paper * 0.48 + offset) - 0.5) * 1.2;
  let settling = mineralNoise(paper * vec2f(0.031, 0.074) + offset + 71.2) * 0.64
    + mineralNoise(paper * vec2f(0.009, 0.023) + offset + 24.8) * 0.36;
  let washTime = time + select(41.0, 0.0, near);
  let seedOffset = select(0.23, 0.0, near);
  let sage = pigmentWash(washDistance(p, WASH_SAGE) + ragged, settling,
    vec3f(-0.053, -0.029, -0.034), 0.17 + seedOffset, washTime);
  let stone = pigmentWash(washDistance(p, WASH_STONE) + ragged, settling,
    vec3f(-0.003, -0.013, -0.032), 0.83 + seedOffset, washTime);
  let east = pigmentWash(washDistance(p, WASH_EAST) + ragged, settling,
    vec3f(-0.035, -0.018, -0.024), 1.61 + seedOffset, washTime);
  var washes = sage + stone + east;
  if (near) {
    washes += pigmentWash(washDistance(p, WASH_SAGE_POOL) + ragged, settling,
      vec3f(-0.024, -0.014, -0.018), 2.39, washTime);
    washes += pigmentWash(washDistance(p, WASH_STONE_POOL) + ragged, settling,
      vec3f(-0.025, -0.032, -0.042), 1.04, washTime);
    washes += pigmentWash(washDistance(p, WASH_EAST_POOL) + ragged, settling,
      vec3f(-0.029, -0.017, -0.022), 1.95, washTime);
    washes += pigmentWash(washDistance(p, WASH_CHALK) + ragged, settling,
      vec3f(0.014, 0.012, 0.009), 2.65, washTime);
  }
  let fibres = noise(paper * vec2f(0.60, 0.85) + offset) - 0.5;
  let fine = mineralNoise(paper * vec2f(0.23, 0.38) + offset + 91.5) - 0.5;
  let paperColor = vec3f((settling - 0.5) * 0.018 + fine * 0.027 + fibres * 0.011);
  return washes * select(0.28, 1.0, near) + paperColor * select(0.70, 1.0, near);
}

fn meadow(point: vec2f, depth: f32, near: bool, time: f32, skyLight: vec3f) -> vec3f {
  var surface = mix(vec3f(0.768, 0.777, 0.740), vec3f(0.780, 0.790, 0.752),
    exp(-depth / 650.0));
  if (near) {
    surface = mix(vec3f(0.745, 0.753, 0.712), vec3f(0.759, 0.765, 0.724),
      exp(-depth / 850.0));
  }
  let horizonWarmth = bell(point.x - 1160.0, 760.0) * exp(-depth / 420.0);
  surface += vec3f(0.020, 0.010, -0.001) * horizonWarmth * select(1.0, 0.2, near);
  surface += mineralWashes(point, depth, near, time);

  // Animate intensity only; light centers stay fixed.
  let lightTime = time - select(0.0, 26.0, near);
  let west = bell(point.x - 220.0, 1100.0) * sin(lightTime * 6.283185 / 137.0 + 0.35);
  let east = bell(point.x - 1240.0, 1050.0) * sin(lightTime * 6.283185 / 173.0 + 2.1);
  let middle = bell(point.x - 760.0, 1800.0) * sin(lightTime * 6.283185 / 157.0 + 4.3);
  let ambient = vec3f(0.009, 0.005, -0.002) * west
    + vec3f(-0.003, 0.003, 0.008) * east + vec3f(0.003, 0.003, 0.003) * middle;
  return surface + (ambient + skyLight * exp(-depth / 500.0)) * select(0.30, 0.15, near);
}

fn brushFibres(p: vec2f, time: f32) -> vec2f {
  let local = p - CENTER;
  let radius = length(local);
  if (radius < 65.0 || radius > 122.0) { return vec2f(0.0); }
  let direction = local / max(radius, 1.0);
  let along = dot(direction, vec2f(2.4, -3.2));
  // Animate fibre shading without displacing the SVG mask.
  let bend = 0.30 * sin(dot(direction, vec2f(3.0, -2.0)) + radius * 0.31 + time * 0.34)
    + 0.12 * sin(dot(direction, vec2f(-5.0, 3.0)) + radius * 0.67 - time * 0.24);
  let lane = radius * 0.48 + bend
    + noise(vec2f(radius * 0.16, dot(direction, vec2f(2.1, 1.7)))) * 0.7;
  let seed = hash(vec2f(floor(lane), 19.4));
  let aa = max(0.018, 0.24 * u.view.x / u.frame.x / u.view.z);
  let thread = 1.0 - smoothstep(0.10 - aa, 0.10 + aa, abs(fract(lane) - 0.5));
  let broken = 0.3 + 0.7 * smoothstep(0.25, 0.8,
    noise(vec2f(radius * 0.62, along * 0.65)));
  let glint = pow(max(0.0, sin(along + time * (0.24 + seed * 0.15)
    + seed * 6.283185)), 10.0);
  return vec2f((thread - 0.2) * broken, thread * broken * glint);
}

fn ink(p: vec2f) -> f32 {
  let uv = (p - vec2f(1048.0, 324.0)) / vec2f(240.0, 230.0);
  let inside = select(0.0, 1.0, all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0)));
  return textureSampleLevel(brush, linearSampler, uv, 0.0).a * inside;
}

@fragment fn landscape(in: VertexOutput) -> @location(0) vec4f {
  let time = u.frame.z * u.interaction.z;
  let point = worldPoint(in.uv);
  let toward = (u.pointer.xy - CENTER) * 0.014 * u.pointer.z * u.interaction.z;
  let breath = sin(time * 0.43) * 0.5 + 0.5;
  let energy = u.pointer.w * 0.85;
  let wave = warmWave(point);
  let refracted = point + wave.xy;
  let air = fbm(refracted * 0.0035 + vec2f(time * 0.018, -time * 0.009));
  let flow = fbm(refracted * 0.0024 + vec2f(air * 1.6, -air * 1.2)
    + vec2f(time * 0.018, -time * 0.011));
  let heat = sin(refracted.y * 0.021 + air * 5.0 + time * 0.32);
  let proximity = exp(-dot((point - CENTER) / 440.0, (point - CENTER) / 440.0));
  let fluid = vec2f(sin(refracted.y * 0.008 + flow * 6.0 + time * 0.16),
    cos(refracted.x * 0.006 + flow * 5.0 - time * 0.12));
  let p = refracted + (vec2f(heat, air - 0.5) * 3.0
    + fluid * (3.0 + energy * 18.0)) * proximity * u.interaction.z;
  let lightCenter = vec2f(1144.0, 443.0) + toward + vec2f(sin(time * 0.12) * 5.0, cos(time * 0.09) * 4.0);
  let q = (p - lightCenter) / vec2f(810.0, 740.0);
  let sunlight = exp(-dot(q, q) * 4.5);
  let sky = mix(vec3f(0.40, 0.52, 0.54), vec3f(0.70, 0.62, 0.55), p.y / WORLD.y);
  var color = mix(sky, vec3f(1.0, 0.83, 0.64), sunlight * 0.99);
  color += (air - 0.5) * vec3f(0.027, 0.023, 0.017) * (0.35 + sunlight);
  color += proximity * vec3f(0.030, 0.019, 0.008) * (breath + u.pointer.w * 2.0);
  color += proximity * vec3f(0.027, 0.016, 0.006) * (u.pointer.z + u.interaction.w * 0.35);
  // Refract only the atmosphere; the terrain uses its own fixed coordinates below.
  let distance = length((p - CENTER) * vec2f(1.0, 0.86));
  let phase = distance * 0.0046 + flow * 3.6 - time * 0.12;
  let ribbon = pow(0.5 + 0.5 * sin(phase * 2.5), 2.0);
  let spectrum = iridescence(phase * 0.16 - time * 0.008 + energy * 0.19);
  let tint = (0.24 + proximity * 0.16 + energy * 0.38) * (0.3 + ribbon * 0.7);
  color = mix(color, 0.25 + spectrum * 0.75, min(tint, 0.78));
  let caustic = pow(0.5 + 0.5 * cos(phase * 6.283185), 24.0);
  color += spectrum * caustic * (0.018 + energy * 0.12) * proximity;

  color *= 1.0 + wave.w * 0.045;
  color = mix(color, vec3f(1.0, 0.77, 0.48), wave.z * 0.075);
  color += vec3f(0.024, 0.012, 0.003) * wave.z;

  let rear = hill(point.x, false);
  let front = hill(point.x, true);
  let edgeWidth = max(0.45, fwidth(point.y) * 0.65);
  let rearMask = smoothstep(rear - edgeWidth, rear + edgeWidth, point.y);
  let frontMask = smoothstep(front - edgeWidth, front + edgeWidth, point.y);
  if (rearMask > 0.0) {
    let skyLight = groundIllumination(time);
    if (frontMask < 1.0) {
      let rearColor = meadow(point, max(0.0, point.y - rear), false, time, skyLight);
      color = mix(color, rearColor, rearMask);
    }
    if (frontMask > 0.0) {
      let frontColor = meadow(point, max(0.0, point.y - front), true, time, skyLight);
      color = mix(color, frontColor, frontMask);
    }
  }

  let ringPoint = point;
  let mask = ink(ringPoint);
  let radius = length(ringPoint - CENTER);
  let angle = atan2(ringPoint.y - CENTER.y, ringPoint.x - CENTER.x);
  // One complete hue cycle closes seamlessly across atan2's -pi/pi boundary.
  let film = iridescence(angle / 6.283185 + radius * 0.009 - time * 0.035 + flow * 0.4);
  let grain = noise(ringPoint * 0.74);
  let fibres = brushFibres(ringPoint, time);
  let rim = vec2f(ink(ringPoint + vec2f(0.8, 0.0)) - ink(ringPoint - vec2f(0.8, 0.0)),
                   ink(ringPoint + vec2f(0.0, 0.8)) - ink(ringPoint - vec2f(0.0, 0.8)));
  let lightDirection = normalize(vec2f(-0.7, -0.8));
  let relief = dot(rim, lightDirection);
  let glint = pow(max(0.0, sin(angle * 1.0 - time * 0.16 + 0.8)), 18.0);
  let innerLight = bell(radius - 99.0, 13.0);
  let warmth = 0.1 + breath * 0.10;
  var pigment = vec3f(0.726, 0.393, 0.252) + vec3f(0.084, 0.055, 0.028) * (grain + 0.5);
  pigment = mix(pigment, film * (0.8 + grain * 0.2),
    min(0.32 + energy * 0.50, 0.9));
  pigment += relief * vec3f(0.40, 0.28, 0.11);
  pigment += vec3f(0.20, 0.115, 0.040) * glint;
  pigment += vec3f(0.11, 0.075, 0.045) * fibres.x;
  pigment += mix(vec3f(1.0, 0.77, 0.46), film, 0.35)
    * fibres.y * 0.10;
  color = mix(color, pigment, mask);
  let ember = mask * (innerLight * 0.6 + glint * 0.7 + max(0.0, relief) * 0.8);
  color += ember * mix(vec3f(1.55, 0.79, 0.27), film * 1.7, 0.65) * warmth;
  color += film * 0.10 * bell(radius - 104.0, 38.0) * warmth;
  let edge = clamp(length(rim) * 1.4, 0.0, 1.0);
  let edgeLight = u.pointer.z * 0.7 + u.pointer.w * 0.9 + u.interaction.y * 0.5;
  color += edge * vec3f(1.3, 0.95, 0.56) * edgeLight;
  let paper = (noise(point * 0.5) - 0.5) * 0.007 + (hash(point * 1.7) - 0.5) * 0.004;
  color += paper * mix(1.0, 0.15, rearMask);
  // Alpha stores terrain coverage for bloom and chromatic-aberration masking.
  return vec4f(max(color, vec3f(0.0)), rearMask);
}
