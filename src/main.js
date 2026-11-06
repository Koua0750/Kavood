import * as THREE from "three";
import Lenis from "lenis";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import "./fonts.css";
import "./style.css";
import logoUrl from "./assets/kavod.png?inline";
import kenteUrl from "./assets/kente2.jpg?inline";
import * as shapes from "./shapes.js";

const SMALL = window.innerWidth < 900;
const N = SMALL ? 32000 : 70000;
const FORCE_FULL = new URLSearchParams(location.search).has("full");
const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Une entrée par section de la page, dans le même ordre.
// x, y : position sur grand écran. ns, cy : taille et centre de la forme dans la zone haute du téléphone.
// shade : voile derrière le texte sur grand écran.
const SCENES = [
  { shape: "drop", x: 3.1, ns: 2.2, cy: 0.45, shade: 0.7, cam: [0, 0.2, 10], look: [0, 0.4, 0], size: 1.5, alpha: 0.32, sway: 0.25 },
  { shape: "ripple", cy: -1.4, shade: 1, cam: [0, 1.1, 9.5], look: [0, -0.5, -2], size: 3.4, alpha: 1.15, ripple: 1 },
  { shape: "sheets", ns: 0.8, cy: 0.5, shade: 1, cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.9, alpha: 0.6, sway: 0.1 },
  { shape: "people", ns: 1.05, cy: 0.55, shade: 1, cam: [0, 0.2, 9.5], look: [0, 0.3, 0], size: 2, alpha: 0.55, sway: 0.16 },
  { shape: "qr", x: 3.3, ns: 1.25, cy: 0.5, shade: 0.9, cam: [0, 0.2, 9.5], look: [0, 0.2, 0], size: 2.5, alpha: 0.85, sway: 0.3 },
  { shape: "infinity", cy: 0.45, shade: 0, cam: [0, 0.2, 10], look: [0, 0.2, 0], size: 1.9, alpha: 0.42, sway: 0.28, shimmer: 1 },
  { shape: "lock", x: 3.3, ns: 1.15, cy: 0.5, shade: 0.9, cam: [0, 0.2, 9.5], look: [0, 0.2, 0], size: 2.4, alpha: 0.85, sway: 0.34, shimmer: 0.6 },
  { shape: "kente", y: 1.3, ns: 0.74, cy: 0.5, shade: 0, cam: [0, 0.2, 9], look: [0, 0.2, 0], size: 2.3, alpha: 1, sway: 0.08, shimmer: 0.8 },
  { shape: "logo", y: 1.1, cy: 0.45, glow: 0.62, shade: 0, cam: [0, 0.2, 10], look: [0, 0.25, 0], size: 2.2, alpha: 0.9, sway: 0.05, shimmer: 0.7 },
];

const VERTEX = /* glsl */ `
  attribute vec3 aRnd;
  uniform highp sampler2D uShapes;
  uniform int uFrom, uTo, uCount, uWidth;
  uniform float uMix, uTime, uSize, uPixel, uRipple, uShimmer, uMotion;
  varying float vTint;
  varying float vGlow;

  vec4 shape(int index) {
    int texel = gl_VertexID + index * uCount;
    return texelFetch(uShapes, ivec2(texel % uWidth, texel / uWidth), 0);
  }

  void main() {
    vec4 aFrom = shape(uFrom);
    vec4 aTo = shape(uTo);
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

const scrim = document.getElementById("scrim");
const footer = document.querySelector(".footer");
const sections = [...document.querySelectorAll(".panel")];

// Hauteur du centre des formes sur téléphone, en part de la moitié haute de l'écran.
const PHONE_ZONE = 0.5;

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

const lenis = CALM ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true, autoRaf: false });

// Sans 3D, personne d'autre n'anime le défilement.
function lenisOnly(now) {
  lenis?.raf(now);
  requestAnimationFrame(lenisOnly);
}

// La barre suit le visiteur : elle s'efface quand il descend et revient dès qu'il remonte.
function navigation() {
  const nav = document.querySelector(".nav");
  const burger = document.querySelector(".burger");
  const links = document.querySelectorAll("#menu a");
  let last = window.scrollY;

  const open = (state) => {
    document.body.classList.toggle("menu-open", state);
    burger.setAttribute("aria-expanded", String(state));
    burger.setAttribute("aria-label", state ? "Fermer le menu" : "Ouvrir le menu");
    if (state) {
      lenis?.stop();
      nav.classList.remove("away");
      links[0].focus({ preventScroll: true });
    } else {
      lenis?.start();
    }
  };

  burger.addEventListener("click", () => open(!document.body.classList.contains("menu-open")));
  links.forEach((a) => a.addEventListener("click", () => open(false)));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      open(false);
      burger.focus();
    }
  });
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      nav.classList.toggle("stuck", y > 40);
      if (Math.abs(y - last) < 6) return;
      nav.classList.toggle("away", y > last && y > window.innerHeight * 0.4);
      last = y;
    },
    { passive: true },
  );
}

// Les textes montent doucement quand leur section arrive, dans les deux sens.
function reveals() {
  const items = document.querySelectorAll(".panel .copy > *, .points li, .domains article");
  items.forEach((el) => {
    const siblings = [...el.parentElement.children];
    el.classList.add("reveal");
    el.style.setProperty("--i", Math.min(siblings.indexOf(el), 6));
  });
  const watch = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle("in", e.isIntersecting)),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
  );
  items.forEach((el) => watch.observe(el));
}

// Le logo a des lettres noires : sur fond sombre, elles passent en ivoire.
async function drawLogo() {
  const img = new Image();
  img.src = logoUrl;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i] + data.data[i + 1] + data.data[i + 2] < 150) {
      data.data[i] = 246;
      data.data[i + 1] = 239;
      data.data[i + 2] = 220;
    }
  }
  ctx.putImageData(data, 0, 0);
  const src = c.toDataURL("image/png");
  document.querySelectorAll(".js-logo").forEach((el) => (el.src = src));
}

// Position dans le parcours : la forme reste posée tant que sa section remplit l'écran,
// puis se transforme entre deux sections. Une section haute garde donc sa forme plus longtemps.
function journey() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  for (let i = 0; i < sections.length; i++) {
    const start = sections[i].offsetTop;
    const end = Math.max(start, start + sections[i].offsetHeight - vh);
    if (y <= end) return i;
    const next = sections[i + 1];
    if (!next) return i;
    if (y < next.offsetTop) return i + smooth(0.12, 0.88, (y - end) / (next.offsetTop - end));
  }
  return sections.length - 1;
}

async function startScene() {
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a0d);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.6, 0.32);
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
    uShapes: { value: null },
    uFrom: { value: 0 },
    uTo: { value: 1 },
    uCount: { value: N },
    uWidth: { value: 1024 },
    uGold: { value: new THREE.Color("#e0a914") },
    uIvory: { value: new THREE.Color("#f6efdc") },
  };

  const geometry = new THREE.BufferGeometry();
  const rnd = new Float32Array(N * 3).map(() => Math.random());
  geometry.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 3));
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));

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

  // Paliers : netteté 1,5 > 1,25 > 1, puis moins de halo, puis moins de points.
  const STEPS = [1.5, 1.25, 1, 1, 1];
  let step = 0;
  let narrow = false;
  let halfH = 7;

  function resize() {
    // Le canevas suit la plus grande hauteur d'écran : la barre du navigateur mobile ne le redimensionne pas.
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, STEPS[step]);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // Sur un écran étroit, on élargit le champ pour garder les formes entières.
    camera.fov = camera.aspect < 1.5 ? 2 * THREE.MathUtils.radToDeg(Math.atan(0.54 / camera.aspect)) : 40;
    camera.updateProjectionMatrix();
    uniforms.uPixel.value = Math.max(Math.min(h, w * 0.5625) / 1080, w < h ? 0.42 : 0.8) * dpr;
    narrow = w <= 900;
    halfH = 10 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }
  window.addEventListener("resize", resize);

  const built = {
    drop: shapes.drop(N),
    ripple: shapes.ripple(N),
    sheets: shapes.sheets(N),
    people: shapes.people(N),
    qr: shapes.qr(N),
    infinity: shapes.infinity(N),
    lock: shapes.lock(N),
    kente: await shapes.kente(N, kenteUrl),
    logo: await shapes.logo(N, logoUrl),
  };

  // Toutes les formes partent une fois pour toutes vers le processeur graphique.
  const WIDTH = uniforms.uWidth.value;
  const rows = Math.ceil((N * SCENES.length) / WIDTH);
  const all = new Float32Array(WIDTH * rows * 4);
  SCENES.forEach((s, i) => all.set(built[s.shape], i * N * 4));
  const texture = new THREE.DataTexture(all, WIDTH, rows, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  uniforms.uShapes.value = texture;

  let shown = journey();
  let last = performance.now();
  let frames = 0;
  let measureStart = 0;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const v = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    lenis?.raf(now);
    uniforms.uTime.value += dt;
    const time = uniforms.uTime.value;

    // Le défilement est lissé : une molette brusque reste fluide.
    const target = journey();
    shown += (target - shown) * (1 - Math.exp(-dt * 11));
    if (Math.abs(target - shown) < 0.0005) shown = target;

    const index = Math.min(Math.floor(shown), SCENES.length - 2);
    const mix = shown - index;
    uniforms.uFrom.value = index;
    uniforms.uTo.value = index + 1;
    uniforms.uMix.value = mix;

    const a = SCENES[index];
    const b = SCENES[index + 1];
    const e = smooth(0, 1, mix);
    // Moins de points et de pixels sur téléphone : chacun brille davantage pour garder la présence de l'or.
    uniforms.uSize.value = lerp(a.size, b.size, e) * (narrow ? 1.3 : 1);
    uniforms.uAlpha.value = lerp(a.alpha, b.alpha, e) * (narrow ? 1.5 * lerp(a.glow ?? 1, b.glow ?? 1, e) : 1);
    // Le logo s'efface quand le pied de page arrive : il ne passe pas sous le texte de fin.
    const fade = (window.scrollY + window.innerHeight - footer.offsetTop) / (footer.offsetHeight * 0.45);
    uniforms.uAlpha.value *= 1 - smooth(0, 1, fade);
    uniforms.uRipple.value = lerp(a.ripple ?? 0, b.ripple ?? 0, e);
    uniforms.uShimmer.value = lerp(a.shimmer ?? 0, b.shimmer ?? 0, e);
    const sway = lerp(a.sway ?? 0, b.sway ?? 0, e) * uniforms.uMotion.value;
    points.rotation.y = Math.sin(time * 0.22) * sway;
    points.rotation.x = Math.sin(time * 0.17) * sway * 0.25;

    const place = (s) => (narrow ? [0, PHONE_ZONE * halfH - s.cy * (s.ns ?? 1)] : [s.x ?? 0, s.y ?? 0]);
    const [ax, ay] = place(a);
    const [bx, by] = place(b);
    points.position.set(lerp(ax, bx, e), lerp(ay, by, e), 0);
    points.scale.setScalar(narrow ? lerp(a.ns ?? 1, b.ns ?? 1, e) : 1);

    camPos.fromArray(a.cam).lerp(v.fromArray(b.cam), e);
    camLook.fromArray(a.look).lerp(v.fromArray(b.look), e);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    scrim.style.opacity = narrow ? 1 : lerp(a.shade, b.shade, e).toFixed(3);

    composer.render();
    // Le fond n'apparaît qu'une fois sa première image prête : pas de saut au chargement.
    if (!canvas.classList.contains("ready")) canvas.classList.add("ready");

    // On mesure en continu : si la page rame, on allège par palier, sans à-coup visible.
    if (!FORCE_FULL && step < STEPS.length - 1 && document.visibilityState === "visible") {
      if (frames === 0) measureStart = now;
      if (++frames === 45) {
        if ((now - measureStart) / 44 > 21) {
          step += 1;
          if (step === 3) bloom.strength = 0.26;
          if (step === 4) {
            bloom.enabled = false;
            geometry.setDrawRange(0, Math.floor(N * 0.55));
          }
          resize();
        }
        frames = 0;
      }
    }
  }

  resize();
  requestAnimationFrame(frame);
}

drawLogo();
reveals();
navigation();
try {
  await startScene();
} catch (error) {
  // Sans 3D, la page reste complète et lisible : seul le fond manque.
  console.warn("3D indisponible", error);
  document.getElementById("scene").remove();
  document.getElementById("scrim").remove();
  requestAnimationFrame(lenisOnly);
}
