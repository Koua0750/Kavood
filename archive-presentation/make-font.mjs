// Prépare les lettres en relief : ne garde que les signes utiles, pour un fichier léger.
import { readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";

const CHARS = " !'’,.:;?-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZàâçéèêëîïôùûüÀÉÈ";
const file = readFileSync("node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff");
const font = opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const scale = 100000 / (font.unitsPerEm * 72);
const r = (v) => Math.round(v * scale);

const glyphs = {};
for (const c of CHARS) {
  const glyph = font.charToGlyph(c);
  if (!glyph.index && c !== " ") console.warn("signe absent :", c);
  const o = glyph.path.commands
    .map((k) => {
      if (k.type === "M") return `m ${r(k.x)} ${r(k.y)}`;
      if (k.type === "L") return `l ${r(k.x)} ${r(k.y)}`;
      if (k.type === "Q") return `q ${r(k.x)} ${r(k.y)} ${r(k.x1)} ${r(k.y1)}`;
      if (k.type === "C") return `b ${r(k.x)} ${r(k.y)} ${r(k.x1)} ${r(k.y1)} ${r(k.x2)} ${r(k.y2)}`;
      return "";
    })
    .join(" ");
  glyphs[c] = { ha: r(glyph.advanceWidth), o };
}

writeFileSync(
  "src/assets/geist-600.json",
  JSON.stringify({
    familyName: "Geist",
    resolution: 1000,
    ascender: r(font.ascender),
    descender: r(font.descender),
    underlinePosition: 0,
    underlineThickness: 50,
    boundingBox: { xMin: 0, yMin: r(font.descender), xMax: 1000, yMax: r(font.ascender) },
    glyphs,
  }),
);
console.log(Object.keys(glyphs).length, "signes");
