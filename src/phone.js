// Smartphone récent en or : cadre fin, bords plats, îlot de caméra, trois objectifs.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

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
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), 14);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

export function createPhone(renderer, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const frame = new THREE.MeshStandardMaterial({ color: 0xc9a356, metalness: 1, roughness: 0.32, envMapIntensity: 0.75 });
  const backPlate = new THREE.MeshStandardMaterial({ color: 0xa8843f, metalness: 0.75, roughness: 0.55, envMapIntensity: 0.6 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x050507, metalness: 0.6, roughness: 0.12 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x060507, metalness: 0.4, roughness: 0.2 });

  const body = new THREE.Mesh(
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
  body.position.z = -0.065;

  const front = new THREE.Mesh(roundedPlane(2.01, 4.35, 0.36), glass);
  front.position.z = 0.098;

  const screen = new THREE.Mesh(
    roundedPlane(1.93, 4.27, 0.31),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xd6d6d6 }),
  );
  screen.position.z = 0.1;

  const island = new THREE.Mesh(roundedPlane(0.6, 0.17, 0.085), new THREE.MeshBasicMaterial({ color: 0x020203 }));
  island.position.set(0, 1.98, 0.103);

  const button = (x, y, h) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.035, h, 0.075, 3, 0.015), frame);
    b.position.set(x, y, 0);
    return b;
  };

  const back = new THREE.Mesh(roundedPlane(1.98, 4.32, 0.34), backPlate);
  back.rotation.y = Math.PI;
  back.position.z = -0.098;

  const block = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.92, 0.07, 5, 0.03), backPlate);
  block.position.set(0.45, 1.58, -0.125);

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

  const phone = new THREE.Group();
  phone.add(
    body,
    front,
    screen,
    island,
    button(-1.045, 1.32, 0.17),
    button(-1.045, 0.92, 0.36),
    button(-1.045, 0.48, 0.36),
    button(1.045, 0.8, 0.56),
    back,
    block,
    objective(0.22, 1.8),
    objective(0.22, 1.36),
    objective(0.67, 1.58),
  );
  return phone;
}
