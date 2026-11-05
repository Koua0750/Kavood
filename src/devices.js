// Téléphone et ordinateur en or, avec les maquettes d'écrans.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { drawScreens } from "./screens.js";

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function roundedPlane(w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 14);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return g;
}

export function createDevices(scene, renderer) {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = {};
  for (const [name, canvas] of Object.entries(drawScreens())) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    textures[name] = t;
  }

  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a520, metalness: 1, roughness: 0.28, envMapIntensity: 0.5 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x0b0a09, metalness: 0.2, roughness: 0.75, envMapIntensity: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x060507, metalness: 0.4, roughness: 0.2 });

  // Téléphone récent : cadre fin, bords plats, écran presque sans bordure.
  const frame = new THREE.MeshStandardMaterial({ color: 0xc9a356, metalness: 1, roughness: 0.34, envMapIntensity: 0.6 });
  const backPlate = new THREE.MeshStandardMaterial({ color: 0xa8843f, metalness: 0.75, roughness: 0.55, envMapIntensity: 0.5 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x050507, metalness: 0.6, roughness: 0.12, envMapIntensity: 1 });
  const black = new THREE.MeshBasicMaterial({ color: 0x020203 });

  const phone = new THREE.Group();
  const phoneBody = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(2.0, 4.34, 0.36), {
      depth: 0.13,
      curveSegments: 14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 4,
    }),
    frame,
  );
  phoneBody.position.z = -0.065;
  const phoneGlass = new THREE.Mesh(roundedPlane(2.01, 4.35, 0.36), glass);
  phoneGlass.position.z = 0.098;
  const phoneScreen = new THREE.Mesh(
    roundedPlane(1.93, 4.27, 0.31),
    new THREE.MeshBasicMaterial({ map: textures.home, color: 0xc0c0c0 }),
  );
  phoneScreen.position.z = 0.1;

  // Îlot noir de la caméra frontale.
  const island = new THREE.Mesh(roundedPlane(0.6, 0.17, 0.085), black);
  island.position.set(0, 1.98, 0.103);

  // Boutons sur les tranches.
  const button = (x, y, h) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.035, h, 0.075, 3, 0.015), frame);
    b.position.set(x, y, 0);
    return b;
  };

  // Dos mat et bloc photo à trois objectifs.
  const back = new THREE.Mesh(roundedPlane(1.98, 4.32, 0.34), backPlate);
  back.rotation.y = Math.PI;
  back.position.z = -0.098;
  const cameraBlock = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.92, 0.07, 5, 0.03), backPlate);
  cameraBlock.position.set(0.45, 1.58, -0.125);
  const objective = (x, y) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 40), frame);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.052, 40), lens);
    ring.rotation.x = Math.PI / 2;
    eye.rotation.x = Math.PI / 2;
    g.add(ring, eye);
    g.position.set(x, y, -0.175);
    return g;
  };

  phone.add(
    phoneBody,
    phoneGlass,
    phoneScreen,
    island,
    button(-1.045, 1.32, 0.17),
    button(-1.045, 0.92, 0.36),
    button(-1.045, 0.48, 0.36),
    button(1.045, 0.8, 0.56),
    back,
    cameraBlock,
    objective(0.22, 1.8),
    objective(0.22, 1.36),
    objective(0.67, 1.58),
  );
  phone.scale.setScalar(0.94);
  scene.add(phone);

  // Ordinateur : l'écran pivote autour de la charnière.
  const laptop = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(5.5, 0.13, 3.5, 4, 0.05), graphite);
  base.position.y = -1;
  const hinge = new THREE.Group();
  hinge.position.set(0, -0.94, -1.72);
  const lidBody = new THREE.Mesh(new RoundedBoxGeometry(5.5, 3.46, 0.09, 4, 0.04), graphite);
  lidBody.position.y = 1.73;
  const lidGlass = new THREE.Mesh(roundedPlane(5.4, 3.36, 0.1), glass);
  lidGlass.position.set(0, 1.73, 0.047);
  const laptopScreen = new THREE.Mesh(
    roundedPlane(5.2, 3.25, 0.06),
    new THREE.MeshBasicMaterial({ map: textures.care }),
  );
  laptopScreen.position.set(0, 1.73, 0.05);
  hinge.add(lidBody, lidGlass, laptopScreen);
  laptop.add(base, hinge);
  scene.add(laptop);

  function update(a, b, mix, time, calm, fit) {
    const e = THREE.MathUtils.smoothstep(mix, 0, 1);
    const bob = calm ? 0 : Math.sin(time * 0.6) * 0.05;
    const sway = calm ? 0 : Math.sin(time * 0.42) * 0.2;
    const w = (kind) => {
      const from = a.device === kind ? 1 : 0;
      const to = b.device === kind ? 1 : 0;
      return from + (to - from) * THREE.MathUtils.smoothstep(mix, 0.25, 0.85);
    };

    const p = w("phone");
    phone.visible = p > 0.005;
    if (phone.visible) {
      // Entre deux écrans, le téléphone fait un tour : le changement se cache derrière lui.
      const both = a.device === "phone" && b.device === "phone";
      const shown = both ? (mix < 0.5 ? a : b) : a.device === "phone" ? a : b;
      phoneScreen.material.map = textures[shown.screen];
      const scale = 1 * p * fit;
      phone.scale.setScalar(Math.max(scale, 0.001));
      phone.position.set(0, (fit > 1 ? 2.2 : 0.92) + bob - (1 - p) * 1.4, 0);
      phone.rotation.set(0.04, (both ? e * Math.PI * 2 : (1 - p) * Math.PI * 1.5) + sway * 0.8, 0);
    }

    const l = w("laptop");
    laptop.visible = l > 0.005;
    if (laptop.visible) {
      const both = a.device === "laptop" && b.device === "laptop";
      const shown = both ? (mix < 0.5 ? a : b) : a.device === "laptop" ? a : b;
      laptopScreen.material.map = textures[shown.screen];
      const dip = both ? Math.abs(mix * 2 - 1) : 1;
      laptopScreen.material.color.setScalar(dip * 0.72);
      laptop.scale.setScalar(Math.max(l * 0.98 * fit, 0.001));
      laptop.position.set(0, (fit > 1 ? 1.6 : 0.78) + bob * 0.6 - (1 - l) * 0.8, 0);
      laptop.rotation.set(0.2, sway * 0.55, 0);
      // Fermé à l'arrivée, l'ordinateur s'ouvre devant l'assemblée.
      hinge.rotation.x = 1.56 * (1 - l) * (1 - l) - 0.14 * l;
    }
  }

  return { update };
}
