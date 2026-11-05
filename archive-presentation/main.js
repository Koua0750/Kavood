import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "@fontsource-variable/geist/index.css";
import "./style.css";
import logoUrl from "./assets/kavod.png?inline";
import kenteUrl from "./assets/kente2.jpg?inline";
import * as shapes from "./shapes.js";
import { createTitles } from "./letters.js";
import { createDevices } from "./devices.js";

const SMALL = window.innerWidth < 768;
const N = SMALL ? 32000 : 70000;
const DRIVE_TIME = 3200;
// 14 scènes : environ 3 minutes en mode automatique.
const AUTO_DELAY = 13000;
const FORCE_FULL = new URLSearchParams(location.search).has("full");
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Une entrée par <section> de index.html, dans le même ordre.
const SCENES = [
  { shape: "drop", cam: [0, 0.2, 10], look: [0, 0.4, 0], size: 1.5, alpha: 0.32, sway: 0.25 },
  { shape: "ripple", cam: [0, 1.1, 9.5], look: [0, -0.5, -2], size: 3.4, alpha: 1.15, ripple: 1 },
  { shape: "sheets", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.9, alpha: 0.6, sway: 0.1 },
  { shape: "people", cam: [0, 0.2, 9.5], look: [0, 0.3, 0], size: 2, alpha: 0.55, sway: 0.16 },
  { shape: "halo", device: "phone", screen: "home", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.2 },
  { shape: "halo", device: "phone", screen: "qr", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.2 },
  { shape: "halo", device: "phone", screen: "kids", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.2 },
  { shape: "halo", device: "phone", screen: "vote", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.2 },
  { shape: "halo", device: "phone", screen: "shops", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.2 },
  { shape: "halo", device: "phone", screen: "transfer", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.2 },
  { shape: "halo", device: "laptop", screen: "care", cam: [0, 0.9, 10], look: [0, 0.2, 0], size: 1.4, alpha: 0.3, sway: 0.12 },
  { shape: "infinity", cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.9, alpha: 0.5, sway: 0.28, shimmer: 1 },
  { shape: "kente", cam: [0, 0.2, 9], look: [0, 0.2, 0], size: 2.3, alpha: 1, sway: 0.08, shimmer: 0.8 },
  { shape: "logo", cam: [0, 0.2, 10], look: [0, 0.25, 0], size: 2.2, alpha: 0.9, sway: 0.05, shimmer: 0.7 },
];

const VERTEX = /* glsl */ `
  attribute vec4 aFrom;
  attribute vec4 aTo;
  attribute vec3 aRnd;
  uniform float uMix, uTime, uSize, uPixel, uRipple, uShimmer, uMotion;
  varying float vTint;
  varying float vGlow;

  void main() {
    float m = clamp((uMix - aRnd.x * 0.35) / 0.65, 0.0, 1.0);
    m = m * m * m * (m * (m * 6.0 - 15.0) + 10.0);
    vec3 p = mix(aFrom.xyz, aTo.xyz, m);

    // La poussière tourbillonne pendant qu'elle change de forme.
    float bell = sin(3.14159 * m) * uMotion;
    float a = bell * (aRnd.z - 0.5) * 3.2;
    p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
    p += bell * 0.7 * vec3(
      sin(uTime * 0.7 + aRnd.y * 40.0),
      cos(uTime * 0.6 + aRnd.z * 40.0),
      sin(uTime * 0.5 + aRnd.x * 40.0));

    // Respiration au repos.
    p += uMotion * 0.014 * vec3(
      sin(uTime + aRnd.x * 30.0),
      cos(uTime * 0.8 + aRnd.y * 30.0),
      sin(uTime * 0.9 + aRnd.z * 30.0));

    float r = length(p.xz - vec2(0.0, -3.0));
    p.y += uRipple * 0.26 * sin(r * 2.4 - uTime * 1.5 * uMotion) * exp(-r * 0.12);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixel * (0.6 + aRnd.z * 0.8) * (10.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vTint = mix(aFrom.w, aTo.w, m);
    vGlow = (0.72 + 0.28 * sin(uTime * 1.2 + aRnd.y * 50.0))
      * (1.0 + uShimmer * 0.8 * sin(p.x * 1.8 - uTime * 1.5));
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uGold, uIvory;
  uniform float uAlpha;
  varying float vTint;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    gl_FragColor = vec4(mix(uGold, uIvory, vTint), (1.0 - d) * (1.0 - d) * uAlpha * vGlow);
  }
`;

const root = document.documentElement;
const hint = document.getElementById("hint");
const sections = [...document.querySelectorAll("section")];
const texts = sections.map((s) => s.querySelector(".line")?.textContent ?? "");

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const sectionHeight = () => sections[1].offsetTop;
const scrollScene = () => window.scrollY / sectionHeight();

async function startScene() {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  root.classList.add("fx");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08070a);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

  scene.add(camera);

  // Les reflets de l'or viennent d'un environnement calculé, sans fichier à charger.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const glint = new THREE.PointLight(0xfff0c8, 0.7, 12, 1.6);
  camera.add(glint);

  await document.fonts.load('600 40px "Geist Variable"');
  const titles = createTitles(texts, camera);
  const devices = createDevices(scene, renderer);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.5, 0.66);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const uniforms = {
    uMix: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 1 },
    uAlpha: { value: 1 },
    uPixel: { value: 1 },
    uRipple: { value: 0 },
    uShimmer: { value: 0 },
    uMotion: { value: CALM ? 0 : 1 },
    uGold: { value: new THREE.Color("#e0a914") },
    uIvory: { value: new THREE.Color("#f6efdc") },
  };

  const geometry = new THREE.BufferGeometry();
  const rnd = new Float32Array(N * 3).map(() => Math.random());
  geometry.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 3));
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const aFrom = new THREE.BufferAttribute(new Float32Array(N * 4), 4);
  const aTo = new THREE.BufferAttribute(new Float32Array(N * 4), 4);
  geometry.setAttribute("aFrom", aFrom);
  geometry.setAttribute("aTo", aTo);

  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  scene.add(points);

  let degraded = false;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, degraded ? 1 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Sur un écran étroit, on élargit le champ pour garder les formes entières.
    camera.fov = camera.aspect < 1.5 ? 2 * THREE.MathUtils.radToDeg(Math.atan(0.54 / camera.aspect)) : 40;
    camera.updateProjectionMatrix();
    titles.layout();
    uniforms.uPixel.value = Math.max(Math.min(h, w * 0.5625) / 1080, w < h ? 0.42 : 0.8) * dpr;
  }
  window.addEventListener("resize", resize);

  let built = {};
  let segment = -1;
  let shown = 0;
  let frames = 0;
  let measureStart = 0;

  function useSegment(index) {
    if (index === segment) return;
    segment = index;
    aFrom.array.set(built[SCENES[index].shape]);
    aTo.array.set(built[SCENES[index + 1].shape]);
    aFrom.needsUpdate = true;
    aTo.needsUpdate = true;
  }

  let last = performance.now();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const v = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    uniforms.uTime.value += dt;
    const time = uniforms.uTime.value;

    // La position lue au défilement est lissée : une molette brusque reste fluide.
    let target = scrollScene();
    if (Math.abs(target - Math.round(target)) < 0.003) target = Math.round(target);
    shown += (target - shown) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - shown) < 0.0005) shown = target;
    shown = Math.min(Math.max(shown, 0), SCENES.length - 1);

    const index = Math.min(Math.floor(shown), SCENES.length - 2);
    const mix = shown - index;
    useSegment(index);
    uniforms.uMix.value = mix;

    const a = SCENES[index];
    const b = SCENES[index + 1];
    const e = smooth(0, 1, mix);
    uniforms.uSize.value = lerp(a.size, b.size, e);
    uniforms.uAlpha.value = lerp(a.alpha, b.alpha, e);
    uniforms.uRipple.value = lerp(a.ripple ?? 0, b.ripple ?? 0, e);
    uniforms.uShimmer.value = lerp(a.shimmer ?? 0, b.shimmer ?? 0, e);
    const sway = lerp(a.sway ?? 0, b.sway ?? 0, e) * uniforms.uMotion.value;
    points.rotation.y = Math.sin(time * 0.22) * sway;
    points.rotation.x = Math.sin(time * 0.17) * sway * 0.25;
    camPos.fromArray(a.cam).lerp(v.fromArray(b.cam), e);
    camLook.fromArray(a.look).lerp(v.fromArray(b.look), e);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // Une lumière passe sur les lettres et fait courir un éclat dans l'or.
    glint.position.set(Math.sin(time * 0.75) * 5.5, -1.2, -2);
    titles.update(shown, time, CALM);
    devices.update(a, b, mix, time, CALM, camera.aspect < 1 ? 1.8 : 1);

    composer.render();

    // Portable modeste : on allège plutôt que de saccader devant l'assemblée.
    if (!degraded && !FORCE_FULL && document.visibilityState === "visible") {
      if (frames === 0) measureStart = now;
      if (++frames === 120) {
        if ((now - measureStart) / 119 > 28) {
          degraded = true;
          bloom.enabled = false;
          geometry.setDrawRange(0, Math.floor(N * 0.55));
          resize();
        }
        frames = -1e9;
      }
    }
  }

  return (async () => {
    built = {
      drop: shapes.drop(N),
      ripple: shapes.ripple(N),
      sheets: shapes.sheets(N),
      people: shapes.people(N),
      qr: shapes.qr(N),
      infinity: shapes.infinity(N),
      halo: shapes.halo(N),
      kente: await shapes.kente(N, kenteUrl),
      logo: await shapes.logo(N, logoUrl),
    };
    shown = scrollScene();
    resize();
    requestAnimationFrame(frame);
  })();
}

// Pilotage en présentation : chaque appui déroule une scène complète, puis se pose dessus.
let driveId = 0;
let goal = 0;
let auto = false;
let autoTimer = 0;

function stopDrive() {
  driveId++;
  root.classList.remove("driving");
}

function go(index) {
  goal = Math.min(Math.max(index, 0), sections.length - 1);
  const id = ++driveId;
  const from = window.scrollY;
  const to = goal * sectionHeight();
  hint.classList.add("off");
  scheduleAuto();
  if (CALM) {
    window.scrollTo(0, to);
    return;
  }
  root.classList.add("driving");
  const start = performance.now();
  const step = (now) => {
    if (id !== driveId) return;
    const t = Math.min((now - start) / DRIVE_TIME, 1);
    window.scrollTo(0, lerp(from, to, smooth(0, 1, t)));
    if (t < 1) requestAnimationFrame(step);
    else root.classList.remove("driving");
  };
  requestAnimationFrame(step);
}

function scheduleAuto() {
  clearTimeout(autoTimer);
  if (auto && goal < sections.length - 1) autoTimer = setTimeout(() => go(goal + 1), AUTO_DELAY);
}

const here = () => (root.classList.contains("driving") ? goal : Math.round(scrollScene()));

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
    e.preventDefault();
    go(here() + 1);
  } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
    e.preventDefault();
    go(here() - 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    go(0);
  } else if (e.key === "End") {
    e.preventDefault();
    go(sections.length - 1);
  } else if (e.key.toLowerCase() === "f") {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen();
  } else if (e.key.toLowerCase() === "a") {
    auto = !auto;
    goal = here();
    scheduleAuto();
  }
});

// Le visiteur reprend la main dès qu'il touche à la molette ou à l'écran.
window.addEventListener("wheel", stopDrive, { passive: true });
window.addEventListener("touchstart", stopDrive, { passive: true });
window.addEventListener("scroll", () => {
  if (window.scrollY > 40) hint.classList.add("off");
}, { passive: true });

let idleTimer = 0;
window.addEventListener("mousemove", () => {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add("idle"), 2000);
});
setTimeout(() => hint.classList.add("off"), 9000);

try {
  await startScene();
} catch (error) {
  // Sans 3D, le site reste lisible : le texte défile, le logo ferme la page.
  console.warn("3D indisponible", error);
  root.classList.remove("fx");
  const img = new Image();
  img.src = logoUrl;
  img.alt = "Kavod";
  img.className = "fallback-logo";
  sections[0].append(img);
}
