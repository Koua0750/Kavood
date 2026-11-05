// Phrases en lettres d'or : chaque lettre est un volume qui se lève, fixé à la caméra.
import * as THREE from "three";
import { Font } from "three/addons/loaders/FontLoader.js";
import fontData from "./assets/geist-600.json";

const SIZE = 0.31;
const DISTANCE = 6;
const LEADING = 1.32;

const font = new Font(fontData);
const cache = new Map();

function glyph(char) {
  if (cache.has(char)) return cache.get(char);
  const geometry = new THREE.ExtrudeGeometry(font.generateShapes(char, SIZE), {
    depth: 0.085,
    curveSegments: 7,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.012,
    bevelSegments: 3,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const middle = (box.min.x + box.max.x) / 2;
  geometry.translate(-middle, -SIZE * 0.36, -0.05);
  const advance = (fontData.glyphs[char].ha / fontData.resolution) * SIZE;
  const entry = { geometry, advance, middle };
  cache.set(char, entry);
  return entry;
}

function breakRows(words, limit, space) {
  const rows = [];
  let row = { words: [], width: 0 };
  for (const word of words) {
    const next = row.width + (row.words.length ? space : 0) + word.width;
    if (row.words.length && next > limit) {
      rows.push(row);
      row = { words: [word], width: word.width };
    } else {
      row.words.push(word);
      row.width = next;
      // Une question se termine sur sa ligne.
      if (word.ends) {
        rows.push(row);
        row = { words: [], width: 0 };
      }
    }
  }
  if (row.words.length) rows.push(row);
  return rows;
}

export function createTitles(texts, camera) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xe2ab1f,
    metalness: 1,
    roughness: 0.34,
    envMapIntensity: 0.62,
  });

  const root = new THREE.Group();
  root.position.z = -DISTANCE;
  camera.add(root);

  const titles = texts.map((text) => {
    const group = new THREE.Group();
    group.visible = false;
    root.add(group);
    if (!text) return { group, words: [], letters: [] };
    const words = text.split(" ").map((word) => {
      const letters = [];
      let x = 0;
      for (const char of word) {
        const { geometry, advance, middle } = glyph(fontData.glyphs[char] ? char : "-");
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.x = x + middle;
        group.add(mesh);
        letters.push(mesh);
        x += advance;
      }
      return { letters, width: x, ends: word === "?" };
    });
    return { group, words, letters: words.flatMap((w) => w.letters) };
  });

  function layout() {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DISTANCE;
    const maxWidth = halfH * camera.aspect * 2 * 0.86;
    const space = SIZE * 0.3;
    root.position.y = -halfH * 0.8;

    for (const title of titles) {
      // Coupure équilibrée : le plus petit gabarit qui garde le nombre de lignes minimal.
      const total = title.words.reduce((sum, w) => sum + w.width + space, -space);
      const count = Math.ceil(total / maxWidth);
      let limit = Math.min(total / count, maxWidth);
      let rows = breakRows(title.words, limit, space);
      while (rows.length > count && limit < maxWidth) {
        limit = Math.min(limit * 1.03, maxWidth);
        rows = breakRows(title.words, limit, space);
      }

      rows.forEach((r, i) => {
        let x = -r.width / 2;
        const y = (rows.length - 1 - i) * SIZE * LEADING;
        for (const word of r.words) {
          for (const mesh of word.letters) {
            mesh.position.x = x + mesh.userData.x;
            mesh.userData.y = y;
          }
          x += word.width + space;
        }
      });
    }
  }

  function update(shown, time, calm) {
    root.rotation.y = calm ? 0 : Math.sin(time * 0.5) * 0.09;
    root.rotation.x = calm ? -0.05 : -0.08 + Math.sin(time * 0.37) * 0.035;

    titles.forEach((title, i) => {
      const distance = Math.abs(shown - i);
      const visible = 1 - THREE.MathUtils.smoothstep(distance, 0.06, 0.34);
      title.group.visible = visible > 0.001 && title.letters.length > 0;
      if (!title.group.visible) return;
      const count = title.letters.length;
      title.letters.forEach((mesh, l) => {
        const t = THREE.MathUtils.clamp(visible * 1.6 - (l / count) * 0.6, 0, 1);
        const e = 1 - (1 - t) ** 3;
        mesh.scale.setScalar(Math.max(e, 0.0001));
        mesh.rotation.x = (1 - e) * -1.5;
        mesh.position.y = mesh.userData.y - (1 - e) * 0.22;
      });
    });
  }

  return { layout, update };
}
