// Chaque forme est un Float32Array de N x 4 : x, y, z, teinte (0 = or, 1 = ivoire).
import * as THREE from "three";

const R = Math.random;
const gauss = () => (R() + R() + R() + R() - 2) / 2;

function shuffled(out) {
  // Mélange pour qu'une réduction du nombre de points garde chaque forme entière.
  for (let i = out.length / 4 - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    for (let k = 0; k < 4; k++) {
      const t = out[i * 4 + k];
      out[i * 4 + k] = out[j * 4 + k];
      out[j * 4 + k] = t;
    }
  }
  return out;
}

function fill(n, fn) {
  const out = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const [x, y, z, tint = 0] = fn(i);
    out[i * 4] = x;
    out[i * 4 + 1] = y;
    out[i * 4 + 2] = z;
    out[i * 4 + 3] = tint;
  }
  return shuffled(out);
}

export function drop(n) {
  return fill(n, () => {
    const a = Math.acos(1 - 2 * R());
    const phi = R() * Math.PI * 2;
    const r = 0.62 * Math.sin(a) * Math.pow(Math.sin(a / 2), 1.5) * Math.sqrt(R() * 0.15 + 0.85);
    return [r * Math.cos(phi), 0.45 + Math.cos(a) * 0.95, r * Math.sin(phi), R() * 0.25];
  });
}

export function ripple(n) {
  return fill(n, () => {
    const r = Math.sqrt(R()) * 15;
    const a = R() * Math.PI * 2;
    return [r * Math.cos(a), -1.4, r * Math.sin(a) - 3, R() * 0.2];
  });
}

export function sheets(n) {
  const count = 30;
  const v = new THREE.Vector3();
  const pages = Array.from({ length: count }, () => {
    const pos = new THREE.Vector3((R() - 0.5) * 13, (R() - 0.5) * 6 + 0.5, R() * 7 - 5);
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 1.6 - 0.8, R() * 1.8 - 0.9, R() * 1.2 - 0.6));
    return new THREE.Matrix4().compose(pos, rot, new THREE.Vector3(1, 1, 1));
  });
  return fill(n, (i) => {
    const w = 0.8;
    const h = 1.1;
    if (R() < 0.45) {
      // contour de la feuille
      const s = R() * 2 * (w + h);
      if (s < w) v.set(s - w / 2, h / 2, 0);
      else if (s < 2 * w) v.set(s - w - w / 2, -h / 2, 0);
      else if (s < 2 * w + h) v.set(-w / 2, s - 2 * w - h / 2, 0);
      else v.set(w / 2, s - 2 * w - h - h / 2, 0);
    } else {
      // lignes d'écriture
      const row = Math.floor(R() * 9);
      const len = row === 8 ? 0.4 : 0.85;
      v.set((R() - 0.5) * w * 0.8 * len, h * 0.38 - (row * h * 0.76) / 8, 0);
    }
    v.applyMatrix4(pages[i % count]);
    return [v.x, v.y, v.z, 0.75];
  });
}

export function people(n) {
  const GROUPS = 7;
  const centers = Array.from({ length: GROUPS }, (_, i) => {
    const a = (i / GROUPS) * Math.PI * 2 + 0.3;
    return [Math.cos(a) * 3.9, Math.sin(a) * 1.75 + 0.55, Math.sin(a * 2) * 1.2];
  });
  centers[0] = [0, 0.55, 0.4];
  const groups = centers.map((c) =>
    Array.from({ length: 62 }, () => [c[0] + gauss() * 1.9, c[1] + gauss() * 1.3, c[2] + gauss() * 1.4]),
  );
  const stars = groups.flat();
  const gap = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

  // Dans chaque groupe, chacun est relié à ses deux voisins les plus proches.
  const links = [];
  for (const group of groups) {
    for (const star of group) {
      const near = group
        .filter((o) => o !== star)
        .sort((p, q) => gap(star, p) - gap(star, q))
        .slice(0, 2);
      for (const other of near) links.push([star, other]);
    }
  }

  // Le groupe du centre et ses voisins se tiennent : toute l'assemblée forme un seul corps.
  const hubs = groups.map((group, i) =>
    group.reduce((best, star) => (gap(star, centers[i]) < gap(best, centers[i]) ? star : best)),
  );
  for (let i = 1; i < GROUPS; i++) {
    links.push([hubs[0], hubs[i]]);
    links.push([hubs[i], hubs[i === GROUPS - 1 ? 1 : i + 1]]);
  }

  // Tirage proportionnel à la longueur : un trait long reste aussi dense qu'un trait court.
  const sums = [];
  let total = 0;
  for (const link of links) {
    total += gap(link[0], link[1]);
    sums.push(total);
  }
  const pick = () => {
    const t = R() * total;
    let low = 0;
    let high = sums.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (sums[mid] < t) low = mid + 1;
      else high = mid;
    }
    return links[low];
  };

  return fill(n, (i) => {
    if (R() < 0.4) {
      const [p, q] = pick();
      const t = R();
      const jitter = () => (R() - 0.5) * 0.012;
      return [
        p[0] + (q[0] - p[0]) * t + jitter(),
        p[1] + (q[1] - p[1]) * t + jitter(),
        p[2] + (q[2] - p[2]) * t + jitter(),
        0,
      ];
    }
    const s = stars[i % stars.length];
    const t = R() * R() * 0.09;
    const a = R() * 6.283;
    const b = Math.acos(1 - 2 * R());
    return [s[0] + t * Math.sin(b) * Math.cos(a), s[1] + t * Math.cos(b), s[2] + t * Math.sin(b) * Math.sin(a), R() * 0.5];
  });
}

export function qr(n) {
  const size = 29;
  const cell = 0.145;
  const finder = (x, y) => {
    for (const [ox, oy] of [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ]) {
      const fx = x - ox;
      const fy = y - oy;
      if (fx >= -1 && fx <= 7 && fy >= -1 && fy <= 7) {
        const ring = Math.max(Math.abs(fx - 3), Math.abs(fy - 3));
        return ring === 3 || ring <= 1;
      }
    }
    return null;
  };
  const on = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const f = finder(x, y);
      if (f === true || (f === null && R() < 0.48)) on.push([x, y]);
    }
  }
  return fill(n, (i) => {
    const [x, y] = on[i % on.length];
    const k = (s) => (s + (R() - 0.5) * 0.86 - (size - 1) / 2) * cell;
    return [k(x), -k(y) + 0.5, (R() - 0.5) * 0.14, 0.15];
  });
}

async function pixels(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
}

export async function kente(n, url) {
  const { w, h, data } = await pixels(url);
  const top = Math.floor(h * 0.375);
  const bottom = Math.floor(h * 0.615);
  const on = [];
  for (let y = top; y < bottom; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      if (data[p] + data[p + 1] + data[p + 2] < 170) on.push([x, y]);
    }
  }
  const scale = 14 / w;
  const radius = 8;
  return fill(n, () => {
    const [x, y] = on[Math.floor(R() * on.length)];
    const a = ((x + R() - w / 2) * scale) / radius;
    return [
      Math.sin(a) * radius,
      ((top + bottom) / 2 - y - R()) * scale + 0.5,
      Math.cos(a) * radius - radius + (R() - 0.5) * 0.05,
      R() * 0.15,
    ];
  });
}

export function halo(n) {
  return fill(n, () => {
    const a = R() * Math.PI * 2;
    const r = 3.1 + gauss() * 1.5 + R() * 1.5;
    return [Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.42 + 0.3 + gauss() * 0.5, Math.sin(a) * r * 0.9 - 1, R() * 0.3];
  });
}

export function lock(n) {
  const inBody = (x, y) => {
    const w = 1.35;
    const top = 0.7;
    const bottom = -1.3;
    const c = 0.26;
    const dx = Math.max(Math.abs(x) - (w - c), 0);
    const dy = Math.max(y - (top - c), bottom + c - y, 0);
    return Math.abs(x) <= w && y <= top && y >= bottom && dx * dx + dy * dy <= c * c;
  };
  const keyhole = (x, y) => x * x + (y + 0.15) ** 2 < 0.075 || (Math.abs(x) < 0.11 && y < -0.15 && y > -0.8);

  return fill(n, () => {
    if (R() < 0.7) {
      let x;
      let y;
      do {
        x = (R() - 0.5) * 2.7;
        y = R() * 2 - 1.3;
      } while (!inBody(x, y) || keyhole(x, y));
      return [x, y + 0.2, (R() - 0.5) * 0.34, R() * 0.2];
    }
    // Anse : deux montants prolongés par un demi-cercle.
    const radius = 0.86;
    const tube = () => gauss() * 0.2;
    const along = R() * (Math.PI * radius + 1.1);
    let x;
    let y;
    if (along < 0.55) {
      x = -radius;
      y = 0.7 + along;
    } else if (along > Math.PI * radius + 0.55) {
      x = radius;
      y = 0.7 + (along - Math.PI * radius - 0.55);
    } else {
      const a = Math.PI - (along - 0.55) / radius;
      x = Math.cos(a) * radius;
      y = 1.25 + Math.sin(a) * radius;
    }
    return [x + tube(), y + 0.2 + tube(), tube(), R() * 0.25];
  });
}

// Croix en volume, d'après l'image de référence : une face avant veinée, des flancs, une face
// arrière, puis des faisceaux derrière, un sol en perspective et de la poussière devant.
export async function cross(n, url) {
  const { w, h, data } = await pixels(url);
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 128;
  const light = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) light[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;

  // Contraste local : on compare chaque point à ses voisins pour révéler les veines du bois.
  const sum = new Float64Array((w + 1) * (h + 1));
  const area = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ok = inside(x, y) ? 1 : 0;
      const at = (y + 1) * (w + 1) + x + 1;
      sum[at] = light[y * w + x] * ok + sum[at - 1] + sum[at - w - 1] - sum[at - w - 2];
      area[at] = ok + area[at - 1] + area[at - w - 1] - area[at - w - 2];
    }
  }
  const box = (table, x0, y0, x1, y1) =>
    table[y1 * (w + 1) + x1] - table[y0 * (w + 1) + x1] - table[y1 * (w + 1) + x0] + table[y0 * (w + 1) + x0];
  const face = [];
  const edge = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const r = 9;
      const x0 = Math.max(x - r, 0);
      const y0 = Math.max(y - r, 0);
      const x1 = Math.min(x + r + 1, w);
      const y1 = Math.min(y + r + 1, h);
      const mean = box(sum, x0, y0, x1, y1) / Math.max(box(area, x0, y0, x1, y1), 1);
      const detail = Math.min(Math.max(0.5 + (light[y * w + x] - mean) / 46, 0), 1);
      const border = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
      face.push(x, y, border ? 1 : detail);
      if (border) edge.push(x, y);
    }
  }

  const count = face.length / 3;
  const edges = edge.length / 2;
  const scale = 0.0043;
  const DEPTH = 0.46;
  const toX = (x) => (x - 216) * scale;
  const toY = (y) => (h / 2 - y) * scale;
  const heart = [toX(214), toY(205)];
  const ground = toY(h) - 0.02;

  return fill(n, () => {
    const r = R();
    if (r < 0.54) {
      // Face avant : la poussière suit les veines, et les arêtes restent nettes.
      let i;
      do {
        i = Math.floor(R() * count);
      } while (R() > Math.pow(face[i * 3 + 2], 2.1) + 0.05);
      const d = face[i * 3 + 2];
      return [toX(face[i * 3] + R()), toY(face[i * 3 + 1] + R()), DEPTH / 2, d > 0.78 ? 0.42 + R() * 0.4 : 0.03 + R() * 0.14];
    }
    if (r < 0.75) {
      // Flancs : le contour de la croix, étiré dans la profondeur.
      const i = Math.floor(R() * edges);
      return [toX(edge[i * 2] + R()), toY(edge[i * 2 + 1] + R()), DEPTH / 2 - R() * DEPTH, R() * 0.1];
    }
    if (r < 0.79) {
      // Face arrière, très légère : elle se devine quand la croix tourne.
      const i = Math.floor(R() * count);
      return [toX(face[i * 3]), toY(face[i * 3 + 1]), -DEPTH / 2, R() * 0.06];
    }
    if (r < 0.9) {
      // Faisceaux diffus, loin derrière la croix : ils glissent quand on tourne autour.
      let x;
      let y;
      do {
        const ray = Math.floor(R() * 9);
        const angle = ((-90 + (ray - 4) * 18) * Math.PI) / 180;
        const len = 0.45 + Math.pow(R(), 1.35) * 3.1;
        const wide = gauss() * (0.05 + len * 0.1);
        x = heart[0] + Math.cos(angle) * len - Math.sin(angle) * wide;
        y = heart[1] + Math.sin(angle) * len + Math.cos(angle) * wide;
      } while (y < ground + 0.05);
      return [x, y, -1.5 - R() * 0.3, R() * 0.1];
    }
    if (r < 0.97) {
      // Sol en perspective, plus dense au pied de la croix.
      const angle = R() * Math.PI * 2;
      const radius = Math.pow(R(), 1.6) * 3.2;
      return [Math.cos(angle) * radius, ground - radius * radius * 0.012 + gauss() * 0.02, Math.sin(angle) * radius * 0.8, R() * 0.1];
    }
    // Poussière en suspension devant la croix.
    return [(R() - 0.5) * 6, ground + R() * 4.3, 0.8 + R() * 1.6, 0.2 + R() * 0.4];
  });
}

export function infinity(n) {
  return fill(n, () => {
    const t = R() * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    const tube = () => gauss() * 0.3;
    return [
      (4.6 * Math.cos(t)) / d + tube(),
      (5.2 * Math.sin(t) * Math.cos(t)) / d + 0.45 + tube(),
      Math.sin(t) * 1.1 + tube(),
      R() * 0.3,
    ];
  });
}

export async function logo(n, url) {
  const { w, h, data } = await pixels(url);
  const on = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      if (data[p + 3] > 128) on.push([x, y, data[p] + data[p + 1] + data[p + 2] < 120 ? 1 : 0]);
    }
  }
  const scale = 8.6 / w;
  return fill(n, () => {
    const [x, y, tint] = on[Math.floor(R() * on.length)];
    return [(x + R() - w / 2) * scale, (h / 2 - y - R()) * scale + 0.45, (R() - 0.5) * 0.05, tint];
  });
}
