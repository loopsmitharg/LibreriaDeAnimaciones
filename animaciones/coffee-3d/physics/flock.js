/**
 * Simulación liviana por partículas para enjambres (cientos o miles de granos) donde un motor rígido completo no aporta nada:
 * velocidad + giro por grano, resortes hacia una composición, campos de fuerza y separación con una grilla espacial.
 * Integración semi-implícita con amortiguación exponencial: estable con cualquier dt (el escenario ya lo acota a 1/20 s).
 */
export class Flock {
  constructor(swarm) {
    this.swarm = swarm; this.n = swarm.count; this.vel = new Float32Array(this.n * 3); this.spin = new Float32Array(this.n * 3);
    this.cells = new Map();
  }
  /** Resorte hacia una composición (Float32Array 3n). k puede variar por grano con `vary` (0..1) para que no lleguen todos igual. */
  spring(target, k, dt, vary = 0) {
    const { pos } = this.swarm, v = this.vel;
    for (let i = 0, j = 0; i < this.n; i++, j += 3) { const kk = k * (1 - vary * ((i * .61803) % 1)) * dt; v[j] += (target[j] - pos[j]) * kk; v[j + 1] += (target[j + 1] - pos[j + 1]) * kk; v[j + 2] += (target[j + 2] - pos[j + 2]) * kk; }
  }
  /** Campo radial alrededor de un punto: strength > 0 atrae, < 0 repele. `swirl` agrega una componente tangencial (giro). */
  field(cx, cy, cz, radius, strength, dt, swirl = 0) {
    const { pos } = this.swarm, v = this.vel, r2 = radius * radius;
    for (let i = 0, j = 0; i < this.n; i++, j += 3) {
      const dx = cx - pos[j], dy = cy - pos[j + 1], dz = cz - pos[j + 2], d2 = dx * dx + dy * dy + dz * dz; if (d2 > r2 || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), f = (1 - d / radius) ** 2 * strength * dt * (.6 + .8 * ((i * .7548) % 1)) / d;      // respuesta distinta por grano
      v[j] += dx * f - dy * f * swirl; v[j + 1] += dy * f + dx * f * swirl; v[j + 2] += dz * f; this.spin[j] += dy * f * 2; this.spin[j + 1] -= dx * f * 2;
    }
  }
  /** Igual que `field` pero midiendo la distancia a un rayo (el del puntero): funciona a cualquier profundidad. */
  rayField(ray, radius, strength, dt) {
    const { pos } = this.swarm, v = this.vel, o = ray.origin, d = ray.direction;
    for (let i = 0, j = 0; i < this.n; i++, j += 3) {
      const px = pos[j] - o.x, py = pos[j + 1] - o.y, pz = pos[j + 2] - o.z, t = px * d.x + py * d.y + pz * d.z; if (t < 0) continue;
      const rx = px - d.x * t, ry = py - d.y * t, rz = pz - d.z * t, dist = Math.hypot(rx, ry, rz); if (dist > radius || dist < 1e-4) continue;
      const f = (1 - dist / radius) ** 2 * strength * dt / dist; v[j] += rx * f; v[j + 1] += ry * f; v[j + 2] += rz * f; this.spin[j] += ry * f * 3; this.spin[j + 1] -= rx * f * 3;
    }
  }
  /** Separación (y alineación opcional) entre vecinos con grilla espacial: O(n). */
  neighbors(radius, push, dt, align = 0) {
    const { pos } = this.swarm, v = this.vel, cells = this.cells, inv = 1 / radius; cells.clear();
    const key = (x, y, z) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) | 0;
    for (let i = 0, j = 0; i < this.n; i++, j += 3) { const k = key(Math.floor(pos[j] * inv), Math.floor(pos[j + 1] * inv), Math.floor(pos[j + 2] * inv)); let c = cells.get(k); if (!c) cells.set(k, (c = [])); c.push(i); }
    for (let i = 0, j = 0; i < this.n; i++, j += 3) {
      const cx = Math.floor(pos[j] * inv), cy = Math.floor(pos[j + 1] * inv), cz = Math.floor(pos[j + 2] * inv); let ax = 0, ay = 0, az = 0, cnt = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const list = cells.get(key(cx + a, cy + b, cz + c)); if (!list) continue;
        for (const o of list) {
          if (o === i) continue; const m = o * 3, dx = pos[j] - pos[m], dy = pos[j + 1] - pos[m + 1], dz = pos[j + 2] - pos[m + 2], d2 = dx * dx + dy * dy + dz * dz; if (d2 > radius * radius || d2 < 1e-8) continue;
          const d = Math.sqrt(d2), f = (1 - d / radius) * push * dt / d; v[j] += dx * f; v[j + 1] += dy * f; v[j + 2] += dz * f;
          if (align) { ax += v[m]; ay += v[m + 1]; az += v[m + 2]; cnt++; }
        }
      }
      if (cnt) { const k = align * dt; v[j] += (ax / cnt - v[j]) * k; v[j + 1] += (ay / cnt - v[j + 1]) * k; v[j + 2] += (az / cnt - v[j + 2]) * k; }
    }
  }
  /** Integra posiciones y rotaciones. drag / spinDrag en 1/s. `face` > 0 orienta el largo del grano hacia su velocidad. */
  integrate(dt, drag = 2, spinDrag = 1.2, maxSpeed = 30) {
    const { pos, quat } = this.swarm, v = this.vel, w = this.spin, kd = Math.exp(-drag * dt), ks = Math.exp(-spinDrag * dt);
    for (let i = 0, j = 0, q = 0; i < this.n; i++, j += 3, q += 4) {
      v[j] *= kd; v[j + 1] *= kd; v[j + 2] *= kd; const sp = Math.hypot(v[j], v[j + 1], v[j + 2]); if (sp > maxSpeed) { const k = maxSpeed / sp; v[j] *= k; v[j + 1] *= k; v[j + 2] *= k; }
      pos[j] += v[j] * dt; pos[j + 1] += v[j + 1] * dt; pos[j + 2] += v[j + 2] * dt;
      w[j] *= ks; w[j + 1] *= ks; w[j + 2] *= ks;
      const wx = w[j] * dt * .5, wy = w[j + 1] * dt * .5, wz = w[j + 2] * dt * .5, x = quat[q], y = quat[q + 1], z = quat[q + 2], ww = quat[q + 3];      // q += ½·ω·q·dt
      let nx = x + wx * ww + wy * z - wz * y, ny = y + wy * ww + wz * x - wx * z, nz = z + wz * ww + wx * y - wy * x, nw = ww - wx * x - wy * y - wz * z;
      const l = 1 / Math.hypot(nx, ny, nz, nw); quat[q] = nx * l; quat[q + 1] = ny * l; quat[q + 2] = nz * l; quat[q + 3] = nw * l;
    }
  }
  /** Giro propio constante y distinto por grano (rad/s): para que nada quede quieto del todo. */
  tumble(amount, dt) { const w = this.spin; for (let i = 0, j = 0; i < this.n; i++, j += 3) { const a = i * 12.9898; w[j] += Math.sin(a) * amount * dt; w[j + 1] += Math.cos(a * 1.7) * amount * dt; w[j + 2] += Math.sin(a * 2.3) * amount * dt; } }
}
