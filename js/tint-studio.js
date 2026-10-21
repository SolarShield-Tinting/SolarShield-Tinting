// SolarShield Tint Studio: interactive 3D window tint preview for the home page.
// Vehicles are built from side profiles (meters, x = length with front at +x,
// y = height, z = width with the driver side at -z), so each body type keeps
// its real proportions and glass layout.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const ZONES = ['windshield', 'visor', 'front', 'rear', 'back'];
const ZONE_LABELS = {
  windshield: 'Windshield',
  visor: 'Visor Strip',
  front: 'Front Sides',
  rear: 'Rear Sides',
  back: 'Back Glass'
};
const ZONE_SUBS = {
  windshield: 'Full clear ceramic heat film',
  visor: 'Sun strip above the AS-1 line',
  front: 'Driver & passenger windows'
};
const FACTORY_CLEAR = 78;     // typical untinted automotive glass VLT
const FACTORY_PRIVACY = 22;   // typical factory privacy glass VLT (SUV / truck / minivan rear)

// ---------------------------------------------------------------------------
// Vehicle library
// body:    lower body side profile, rear-bottom -> over the top -> front-bottom
//          (wheel arches are cut automatically along the bottom edge)
// cabin:   greenhouse profile, extruded narrower than the body (tumblehome)
// windows: side glass zones as x ranges, cut from the inset cabin profile
// shield / back: glass panels as [base, top] profile points
// ---------------------------------------------------------------------------
const VEHICLES = {
  sedan: {
    label: 'Sedan', badge: 'Midsize Sedan', cls: 'car', privacy: false,
    W: 1.84, wheelR: 0.34, wheelX: [-1.38, 1.44],
    body: [[-2.36, 0.30], [-2.44, 0.42], [-2.43, 0.72], [-2.36, 0.93], [-2.20, 0.99], [-1.55, 1.00], [0.95, 0.99], [1.30, 0.97], [2.10, 0.86], [2.38, 0.76], [2.45, 0.60], [2.43, 0.40], [2.36, 0.30]],
    cabin: [[-1.66, 0.94], [-0.98, 1.40], [-0.60, 1.445], [0.20, 1.445], [0.42, 1.42], [1.12, 0.94]],
    cabinW: 1.60, belt: 0.99,
    windows: [{ zone: 'front', x: [-0.02, 9] }, { zone: 'rear', x: [-9, -0.12] }],
    shield: [[1.12, 0.94], [0.42, 1.42]],
    back: [{ a: [-1.66, 0.94], b: [-0.98, 1.40] }],
    seams: [[0.98], [-0.07], [-1.22]],
    head: { x: 2.36, y: 0.74, h: 0.09, zc: 0.62, zw: 0.40 },
    tail: { x: -2.42, y: 0.86, h: 0.10, zc: 0.62, zw: 0.42 },
    grille: { x: 2.44, y: 0.52, h: 0.16, zw: 0.90 },
    mirror: { x: 0.86, y: 1.07, s: 1 },
    text: { rear: 'Rear door windows', back: 'Rear windshield' }
  },
  coupe: {
    label: 'Coupe', badge: 'Sports Coupe', cls: 'car', privacy: false,
    W: 1.92, wheelR: 0.36, wheelX: [-1.40, 1.45],
    body: [[-2.28, 0.30], [-2.38, 0.45], [-2.36, 0.80], [-2.28, 0.94], [-2.05, 0.97], [-1.85, 0.97], [0.70, 0.96], [1.05, 0.94], [2.05, 0.84], [2.32, 0.74], [2.40, 0.56], [2.37, 0.38], [2.28, 0.30]],
    cabin: [[-1.95, 0.92], [-0.70, 1.34], [-0.35, 1.38], [0.05, 1.37], [0.30, 1.32], [1.14, 0.92]],
    cabinW: 1.56, belt: 0.97,
    windows: [{ zone: 'front', x: [-0.85, 9] }, { zone: 'rear', x: [-1.50, -0.95] }],
    shield: [[1.14, 0.92], [0.30, 1.32]],
    back: [{ a: [-1.95, 0.92], b: [-0.70, 1.34] }],
    seams: [[0.95], [-0.93]],
    head: { x: 2.33, y: 0.73, h: 0.08, zc: 0.66, zw: 0.42 },
    tail: { x: -2.37, y: 0.84, h: 0.11, zc: 0.62, zw: 0.48 },
    grille: { x: 2.40, y: 0.50, h: 0.18, zw: 0.95 },
    mirror: { x: 0.92, y: 1.05, s: 1 },
    text: { rear: 'Rear quarter glass', back: 'Fastback glass' }
  },
  suv: {
    label: 'SUV', badge: 'Midsize SUV', cls: 'mpv', privacy: true,
    W: 1.95, wheelR: 0.38, wheelX: [-1.45, 1.45],
    body: [[-2.36, 0.42], [-2.45, 0.55], [-2.46, 1.06], [-2.40, 1.10], [1.05, 1.10], [1.35, 1.08], [2.20, 1.00], [2.42, 0.90], [2.47, 0.62], [2.44, 0.48], [2.36, 0.42]],
    cabin: [[-2.44, 1.05], [-2.30, 1.72], [-2.05, 1.77], [0.35, 1.77], [0.55, 1.74], [1.40, 1.05]],
    cabinW: 1.72, belt: 1.10,
    windows: [{ zone: 'front', x: [-0.02, 9] }, { zone: 'rear', x: [-1.02, -0.12] }, { zone: 'rear', x: [-2.25, -1.12] }],
    shield: [[1.40, 1.05], [0.55, 1.74]],
    back: [{ a: [-2.44, 1.05], b: [-2.30, 1.72] }],
    seams: [[1.05], [-0.07], [-1.10]],
    head: { x: 2.42, y: 0.90, h: 0.10, zc: 0.66, zw: 0.40 },
    tail: { x: -2.46, y: 1.02, h: 0.16, zc: 0.74, zw: 0.30 },
    grille: { x: 2.47, y: 0.68, h: 0.22, zw: 1.00 },
    mirror: { x: 1.15, y: 1.20, s: 1.1 },
    rails: { x0: -1.95, x1: 0.25 },
    text: { rear: 'Rear doors & quarter glass', back: 'Liftgate glass' }
  },
  truck: {
    label: 'Truck', badge: 'Crew Cab Pickup', cls: 'mpv', privacy: true,
    W: 2.03, wheelR: 0.42, wheelX: [-1.80, 1.75],
    body: [[-2.90, 0.48], [-2.95, 0.60], [-2.95, 0.96], [-0.82, 0.96], [-0.82, 1.32], [0.80, 1.32], [1.20, 1.30], [2.65, 1.24], [2.93, 1.17], [2.97, 0.95], [2.97, 0.58], [2.90, 0.48]],
    cabin: [[-0.80, 1.28], [-0.78, 1.92], [-0.55, 1.96], [0.30, 1.96], [0.50, 1.92], [1.24, 1.28]],
    cabinW: 1.82, belt: 1.32,
    windows: [{ zone: 'front', x: [-0.12, 9] }, { zone: 'rear', x: [-0.70, -0.22] }],
    shield: [[1.24, 1.28], [0.50, 1.92]],
    back: [{ a: [-0.80, 1.42], b: [-0.785, 1.84], z: [-0.56, 0.56], bow: 0 }],
    seams: [[1.18], [-0.17], [-0.79]],
    bed: { x0: -2.95, x1: -0.84, y0: 0.94, y1: 1.30, t: 0.06 },
    head: { x: 2.94, y: 1.08, h: 0.14, zc: 0.78, zw: 0.30 },
    tail: { x: -2.97, y: 1.08, h: 0.30, zc: 0.93, zw: 0.10 },
    grille: { x: 2.97, y: 0.90, h: 0.40, zw: 1.30 },
    mirror: { x: 1.15, y: 1.42, s: 1.35 },
    text: { rear: 'Rear door windows', back: 'Rear cab slider' }
  },
  van: {
    label: 'Work Van', badge: 'High-Roof Work Van', cls: 'mpv', privacy: false, bevel: 0.14,
    W: 2.05, wheelR: 0.38, wheelX: [-1.55, 2.15],
    body: [[-2.92, 0.45], [-2.99, 0.58], [-2.99, 2.42], [-2.92, 2.52], [0.88, 2.52], [0.92, 2.50], [0.92, 1.22], [1.40, 1.22], [1.85, 1.24], [2.55, 1.05], [2.88, 0.95], [2.99, 0.75], [2.99, 0.55], [2.92, 0.45]],
    cabin: [[0.86, 1.18], [0.86, 2.47], [1.12, 2.46], [1.32, 2.15], [1.96, 1.18]],
    cabinW: 1.99, belt: 1.22, noRear: true,
    windows: [{ zone: 'front', x: [1.00, 9] }],
    shield: [[1.96, 1.18], [1.32, 2.15]],
    back: [
      { a: [-2.99, 1.50], b: [-2.99, 2.12], z: [-0.92, -0.07], bow: 0, surf: 'body' },
      { a: [-2.99, 1.50], b: [-2.99, 2.12], z: [0.07, 0.92], bow: 0, surf: 'body' }
    ],
    seams: [[1.92], [0.95], [0.90, 2.30], [-0.70, 2.30]],
    rearSeam: true,
    head: { x: 2.92, y: 1.02, h: 0.14, zc: 0.74, zw: 0.34 },
    tail: { x: -3.00, y: 1.00, h: 0.42, zc: 0.95, zw: 0.08 },
    grille: { x: 2.99, y: 0.84, h: 0.24, zw: 1.00 },
    mirror: { x: 1.90, y: 1.45, s: 1.6 },
    text: { rear: 'Cargo area has no side glass', back: 'Rear door windows' }
  },
  minivan: {
    label: 'Minivan', badge: 'Minivan', cls: 'mpv', privacy: true,
    W: 2.02, wheelR: 0.36, wheelX: [-1.55, 1.52],
    body: [[-2.48, 0.35], [-2.58, 0.50], [-2.58, 1.02], [-2.50, 1.06], [1.20, 1.06], [1.50, 1.04], [2.25, 0.96], [2.50, 0.84], [2.58, 0.60], [2.55, 0.42], [2.48, 0.35]],
    cabin: [[-2.56, 1.02], [-2.42, 1.70], [-2.10, 1.77], [0.50, 1.77], [0.75, 1.72], [1.58, 1.02]],
    cabinW: 1.80, belt: 1.06,
    windows: [{ zone: 'front', x: [0.38, 9] }, { zone: 'rear', x: [-1.00, 0.28] }, { zone: 'rear', x: [-2.32, -1.10] }],
    shield: [[1.58, 1.02], [0.75, 1.72]],
    back: [{ a: [-2.56, 1.02], b: [-2.42, 1.70] }],
    seams: [[1.50], [0.30], [-1.05]],
    head: { x: 2.50, y: 0.84, h: 0.10, zc: 0.68, zw: 0.40 },
    tail: { x: -2.58, y: 1.00, h: 0.20, zc: 0.80, zw: 0.20 },
    grille: { x: 2.58, y: 0.62, h: 0.20, zw: 0.95 },
    mirror: { x: 1.42, y: 1.16, s: 1.15 },
    text: { rear: 'Sliding door & quarter glass', back: 'Liftgate glass' }
  }
};

const VIEWS = {
  '3q': [1.0, 0.3, -1.05],
  side: [0.0001, 0.16, -1],
  front: [1, 0.2, -0.0001],
  rear: [-1.0, 0.32, -0.95]
};

// ---------------------------------------------------------------------------
// Small 2D geometry helpers
// ---------------------------------------------------------------------------
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul2 = (a, s) => [a[0] * s, a[1] * s];
const len2 = a => Math.hypot(a[0], a[1]);
const norm2 = a => mul2(a, 1 / (len2(a) || 1));

function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return s / 2;
}

const ccw = poly => (signedArea(poly) < 0 ? poly.slice().reverse() : poly);

function centroid(poly) {
  let x = 0, y = 0;
  poly.forEach(p => { x += p[0]; y += p[1]; });
  return [x / poly.length, y / poly.length];
}

function lineIntersect(p, d, q, e) {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return add2(p, mul2(d, t));
}

// Shrink a convex CCW polygon by d (window frame / pillar thickness)
function insetPoly(poly, d) {
  const n = poly.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const e1 = norm2(sub2(p1, p0)), e2 = norm2(sub2(p2, p1));
    const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]];
    const hit = lineIntersect(add2(p0, mul2(n1, d)), e1, add2(p1, mul2(n2, d)), e2);
    out.push(hit || add2(p1, mul2(norm2(add2(n1, n2)), d)));
  }
  return out;
}

// Sutherland-Hodgman against a half-plane where f(p) >= 0 (f must be linear)
function clipPoly(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared materials and textures
// ---------------------------------------------------------------------------
const paintMat = new THREE.MeshPhysicalMaterial({
  color: 0xf2f4f7, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05
});
const trimMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.7, metalness: 0.1 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.92, metalness: 0 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.25, metalness: 0.9 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.6 });
const headMat = new THREE.MeshStandardMaterial({ color: 0xdfe9f7, emissive: 0xcfe2ff, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.2 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0x7a0b10, emissive: 0xd0141c, emissiveIntensity: 0.55, roughness: 0.3 });
const seamMat = new THREE.MeshBasicMaterial({ color: 0x050608 });
const outlineMat = new THREE.LineBasicMaterial({ color: 0xffd000, transparent: true, opacity: 0.95 });

function makeGlassMat() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x333333, roughness: 0.08, metalness: 0, specularIntensity: 0.45,
    envMapIntensity: 0.28, vertexColors: true, side: THREE.DoubleSide,
    emissive: 0xffd000, emissiveIntensity: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  });
}
const glassMats = Object.fromEntries(ZONES.map(z => [z, makeGlassMat()]));
glassMats.visor.polygonOffsetFactor = -2;
glassMats.visor.polygonOffsetUnits = -2;

function fadeTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.45, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.85)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Vehicle construction
// ---------------------------------------------------------------------------
function extrude(shape, width, bevel) {
  const depth = width - bevel * 2;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel,
    bevelSegments: 5, curveSegments: 28
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

function bodyShape(v) {
  const pts = v.body;
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  const base = pts[pts.length - 1][1];
  const R = v.wheelR + 0.06;
  [...v.wheelX].sort((a, b) => b - a).forEach(cx => {
    const a0 = Math.asin(Math.max(-1, Math.min(1, (base - v.wheelR) / R)));
    s.lineTo(cx + R * Math.cos(a0), base);
    s.absarc(cx, v.wheelR, R, a0, Math.PI - a0, false);
  });
  s.lineTo(pts[0][0], pts[0][1]);
  return s;
}

function shapeFrom(poly) {
  return new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], p[1])));
}

// Vertical gradient (lighter at the top like real glass catching sky)
function shadeByHeight(geo) {
  const pos = geo.attributes.position;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i++) { min = Math.min(min, pos.getY(i)); max = Math.max(max, pos.getY(i)); }
  const col = [];
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min) / ((max - min) || 1);
    const c = 0.85 + 0.2 * t;
    col.push(c, c, c);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
}

function sideWindow(poly, z) {
  const geo = new THREE.ShapeGeometry(shapeFrom(poly));
  geo.translate(0, 0, z);
  shadeByHeight(geo);
  const outline = new THREE.BufferGeometry().setFromPoints(poly.map(p => new THREE.Vector3(p[0], p[1], z + Math.sign(z) * 0.002)));
  return { geo, outline };
}

// Glass panel spanning the width along a profile edge (windshield, back glass)
function glassPanel(a, b, z0, z1, center, offset, bow) {
  const d = sub2(b, a);
  let n = norm2([d[1], -d[0]]);
  const mid = mul2(add2(a, b), 0.5);
  if ((mid[0] - center[0]) * n[0] + (mid[1] - center[1]) * n[1] < 0) n = mul2(n, -1);
  const segs = 12, pos = [], col = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = z0 + (z1 - z0) * t;
    const k = 2 * t - 1;
    const o = offset - bow * k * k;
    pos.push(a[0] + n[0] * o, a[1] + n[1] * o, z); col.push(0.85, 0.85, 0.85);
    pos.push(b[0] + n[0] * o, b[1] + n[1] * o, z); col.push(1.05, 1.05, 1.05);
  }
  for (let i = 0; i < segs; i++) {
    const k = i * 2;
    idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const o = offset + 0.003;
  const edge = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, k = 2 * t - 1, oo = o - bow * k * k;
    edge.push(new THREE.Vector3(b[0] + n[0] * oo, b[1] + n[1] * oo, z0 + (z1 - z0) * t));
  }
  for (let i = segs; i >= 0; i--) {
    const t = i / segs, k = 2 * t - 1, oo = o - bow * k * k;
    edge.push(new THREE.Vector3(a[0] + n[0] * oo, a[1] + n[1] * oo, z0 + (z1 - z0) * t));
  }
  const outline = new THREE.BufferGeometry().setFromPoints(edge);
  return { geo, outline };
}

function wheel(r, w) {
  const g = new THREE.Group();
  const prof = [
    [r * 0.64, -w / 2], [r * 0.9, -w / 2], [r * 0.985, -w / 2 + 0.035], [r, -w / 2 + 0.07],
    [r, w / 2 - 0.07], [r * 0.985, w / 2 - 0.035], [r * 0.9, w / 2], [r * 0.64, w / 2]
  ].map(p => new THREE.Vector2(p[0], p[1]));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), tireMat);
  tire.rotation.x = Math.PI / 2;
  g.add(tire);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.64, r * 0.64, w * 0.8, 40), hubMat);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, r * 0.035, 8, 48), rimMat);
  lip.position.z = w * 0.4;
  g.add(lip);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(r * 0.56, r * 0.13, 0.035), rimMat);
    const a = (i / 5) * Math.PI * 2;
    spoke.position.set(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, w * 0.41);
    spoke.rotation.z = a;
    g.add(spoke);
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.13, 0.02, 24), rimMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = w * 0.43;
  g.add(cap);
  return g;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function buildVehicle(v) {
  const group = new THREE.Group();
  const zoneMeshes = Object.fromEntries(ZONES.map(z => [z, []]));
  const outlines = Object.fromEntries(ZONES.map(z => [z, new THREE.Group()]));
  const bodyBevel = v.bevel ?? 0.09, cabinBevel = 0.07;
  const base = v.body[v.body.length - 1][1];

  group.add(new THREE.Mesh(extrude(bodyShape(v), v.W, bodyBevel), paintMat));
  const cabinPoly = ccw(v.cabin);
  group.add(new THREE.Mesh(extrude(shapeFrom(cabinPoly), v.cabinW, cabinBevel), paintMat));

  const addGlass = (zone, geo, outline) => {
    const m = new THREE.Mesh(geo, glassMats[zone]);
    m.userData.zone = zone;
    zoneMeshes[zone].push(m);
    group.add(m);
    outlines[zone].add(new THREE.LineLoop(outline, outlineMat));
  };

  // Side glass: inset greenhouse, cut at the sill and split at the pillars
  const frame = insetPoly(cabinPoly, cabinBevel + 0.045);
  v.windows.forEach(w => {
    let poly = clipPoly(frame, p => p[1] - (v.belt + 0.025));
    poly = clipPoly(poly, p => p[0] - w.x[0]);
    poly = clipPoly(poly, p => w.x[1] - p[0]);
    if (poly.length < 3) return;
    [-1, 1].forEach(side => {
      const { geo, outline } = sideWindow(poly, side * (v.cabinW / 2 + 0.004));
      addGlass(w.zone, geo, outline);
    });
  });

  // Windshield and the visor strip along its top edge
  const cabinCenter = centroid(cabinPoly);
  const raise = (a, b) => {
    if (a[1] >= v.belt + 0.02) return a;
    const t = (v.belt + 0.02 - a[1]) / (b[1] - a[1]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const shA = raise(v.shield[0], v.shield[1]), shB = v.shield[1];
  const shDir = sub2(shB, shA);
  const shLen = len2(shDir);
  const sA = add2(shA, mul2(shDir, 0.02)), sB = add2(shA, mul2(shDir, 0.965));
  const hw = v.cabinW / 2 - cabinBevel * 0.6;
  {
    const { geo, outline } = glassPanel(sA, sB, -hw, hw, cabinCenter, 0.006, 0.04);
    addGlass('windshield', geo, outline);
  }
  {
    const vA = add2(sB, mul2(shDir, -0.15 / shLen));
    const { geo, outline } = glassPanel(vA, sB, -hw, hw, cabinCenter, 0.011, 0.04);
    addGlass('visor', geo, outline);
  }

  // Back glass (rear window, liftgate, cab slider or van rear doors)
  const bodyCenter = centroid(v.body);
  v.back.forEach(g => {
    const onBody = g.surf === 'body';
    const a = onBody ? g.a : raise(g.a, g.b);
    const d = sub2(g.b, a);
    const pa = add2(a, mul2(d, 0.03)), pb = add2(a, mul2(d, 0.965));
    const half = v.cabinW / 2 - cabinBevel - 0.03;
    const z = g.z || [-half, half];
    const { geo, outline } = glassPanel(pa, pb, z[0], z[1], onBody ? bodyCenter : cabinCenter,
      0.006, g.bow ?? 0.04);
    addGlass('back', geo, outline);
  });

  // Wheels
  const tireW = Math.min(0.3, v.W * 0.135);
  v.wheelX.forEach(x => {
    [-1, 1].forEach(side => {
      const wh = wheel(v.wheelR, tireW);
      wh.position.set(x, v.wheelR, side * (v.W / 2 - tireW / 2 - 0.015));
      if (side < 0) wh.rotation.y = Math.PI;
      group.add(wh);
    });
  });

  // Door seams, stopping above the wheel arches
  const archR = v.wheelR + 0.06;
  v.seams.forEach(([x, top]) => {
    let y0 = base + 0.06;
    v.wheelX.forEach(wx => {
      if (Math.abs(x - wx) < archR) y0 = Math.max(y0, v.wheelR + Math.sqrt(archR * archR - (x - wx) ** 2) + 0.03);
    });
    const y1 = (top ?? v.belt) - 0.015;
    if (y1 <= y0) return;
    [-1, 1].forEach(side => group.add(box(0.008, y1 - y0, 0.006, seamMat, x, (y0 + y1) / 2, side * v.W / 2)));
  });
  if (v.rearSeam) group.add(box(0.006, 1.8, 0.008, seamMat, v.body[2][0] - 0.001, 1.45, 0));

  // Lights, grille, mirrors
  [-1, 1].forEach(side => {
    group.add(box(0.05, v.head.h, v.head.zw, headMat, v.head.x - 0.02, v.head.y, side * v.head.zc));
    group.add(box(0.05, v.tail.h, v.tail.zw, tailMat, v.tail.x + 0.015, v.tail.y, side * v.tail.zc));
    const s = v.mirror.s;
    const mz = side * (v.cabinW / 2 + 0.11 * s);
    group.add(box(0.14 * s, 0.11 * s, 0.17 * s, paintMat, v.mirror.x, v.mirror.y + 0.06 * s, mz));
    group.add(box(0.06, 0.04, 0.12 * s, trimMat, v.mirror.x + 0.02, v.mirror.y, side * (v.cabinW / 2 + 0.03)));
  });
  group.add(box(0.05, v.grille.h, v.grille.zw, trimMat, v.grille.x, v.grille.y, 0));

  // Pickup bed walls, tailgate and liner
  if (v.bed) {
    const b = v.bed, len = b.x1 - b.x0, h = b.y1 - b.y0;
    [-1, 1].forEach(side => group.add(box(len, h, b.t, paintMat, b.x0 + len / 2, b.y0 + h / 2, side * (v.W / 2 - b.t / 2))));
    group.add(box(b.t, h, v.W, paintMat, b.x0 + b.t / 2, b.y0 + h / 2, 0));
    group.add(box(b.t, h, v.W - 0.02, paintMat, b.x1 - b.t / 2, b.y0 + h / 2, 0));
    group.add(box(len - b.t * 2, 0.012, v.W - b.t * 2, trimMat, b.x0 + len / 2, b.y0 + 0.03, 0));
  }

  // SUV roof rails
  if (v.rails) {
    const len = v.rails.x1 - v.rails.x0;
    const top = Math.max(...v.cabin.map(p => p[1]));
    [-1, 1].forEach(side => group.add(box(len, 0.04, 0.05, trimMat, v.rails.x0 + len / 2, top + 0.02, side * (v.cabinW / 2 - 0.16))));
  }

  return { group, zoneMeshes, outlines };
}

// ---------------------------------------------------------------------------
// Tint math
// ---------------------------------------------------------------------------
function factoryVlt(v, zone) {
  return v.privacy && (zone === 'rear' || zone === 'back') ? FACTORY_PRIVACY : FACTORY_CLEAR;
}

function netVlt(v, film, zone) {
  if (zone === 'visor') {
    const ws = film.windshield ?? 100;
    return FACTORY_CLEAR * (ws / 100) * ((film.visor ?? 100) / 100);
  }
  return factoryVlt(v, zone) * ((film[zone] ?? 100) / 100);
}

// How bright the glass reads from outside (dark cabin behind it)
const glassShade = net => 0.30 * Math.pow(Math.max(net, 0.5) / 100, 1.1);

function cssGlass(net) {
  const s = glassShade(net);
  const c = [0.86, 0.92, 0.96].map(k => Math.round(255 * Math.pow(Math.min(1, k * s * 1.6), 1 / 2.2)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export function initTintStudio() {
  const stage = document.getElementById('ts-stage');
  const canvas = document.getElementById('ts-canvas');
  if (!stage || !canvas) return;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    vehicle: 'sedan',
    zone: 'front',
    film: { windshield: null, visor: null, front: 30, rear: 15, back: 15 }
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.error('Tint studio: WebGL unavailable', err);
    $('#ts-loading')?.classList.add('hidden');
    $('#ts-fallback')?.classList.remove('hidden');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.rotateSpeed = 0.8;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.6;

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(5, 9, -4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5b9bff, 1.1);
  rim.position.set(-7, 3, 6);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x0a0d14, 0.35));

  // Showroom floor: dark disc, turntable and soft contact shadow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: fadeTexture('rgba(16,24,40,1)', 'rgba(16,24,40,0)'), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const turntable = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ map: fadeTexture('#1a2438', '#0f1626') }));
  turntable.rotation.x = -Math.PI / 2;
  turntable.position.y = 0.001;
  scene.add(turntable);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: 0x0d62d9, transparent: true, opacity: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.04, 1.045, 128), new THREE.MeshBasicMaterial({ color: 0xffd000, transparent: true, opacity: 0.35 }));
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.002;
  scene.add(ring2);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.003;
  scene.add(shadow);

  let current = null;     // { group, zoneMeshes, outlines }
  let fit = { target: new THREE.Vector3(), radius: 3 };
  let tween = null;
  let hovered = null;

  controls.addEventListener('start', () => { controls.autoRotate = false; tween = null; });

  function disposeGroup(g) {
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  function viewDistance() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    return fit.radius / Math.sin(Math.min(vFov, hFov) / 2) * 0.8;
  }

  function goToView(name, instant) {
    const dir = new THREE.Vector3(...VIEWS[name]).normalize();
    const to = fit.target.clone().add(dir.multiplyScalar(viewDistance()));
    controls.autoRotate = false;
    if (instant || reduceMotion) {
      camera.position.copy(to);
      controls.target.copy(fit.target);
      controls.update();
      return;
    }
    tween = {
      fromPos: camera.position.clone(), toPos: to,
      fromTgt: controls.target.clone(), toTgt: fit.target.clone(),
      t0: performance.now(), dur: 700
    };
  }

  function setVehicle(id, keepView) {
    const v = VEHICLES[id];
    state.vehicle = id;
    if (current) { scene.remove(current.group); disposeGroup(current.group); }
    current = buildVehicle(v);
    scene.add(current.group);
    ZONES.forEach(z => { current.outlines[z].visible = false; current.group.add(current.outlines[z]); });

    const bb = new THREE.Box3().setFromObject(current.group);
    const size = bb.getSize(new THREE.Vector3());
    fit.target.set(0, size.y * 0.42, 0);
    fit.radius = Math.max(size.x, size.y * 1.6) * 0.55;
    const tr = size.x * 0.62;
    turntable.scale.setScalar(tr);
    floor.scale.setScalar(tr * 5);
    ring.scale.setScalar(tr);
    ring2.scale.setScalar(tr);
    shadow.scale.set(size.x * 1.15, size.z * 1.7, 1);
    controls.minDistance = fit.radius * 1.3;
    controls.maxDistance = fit.radius * 4;

    if (v.noRear && state.zone === 'rear') state.zone = 'front';
    if (keepView) {
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(fit.target.clone().add(dir.multiplyScalar(viewDistance())));
      controls.target.copy(fit.target);
      controls.update();
    } else {
      goToView('3q', true);
    }
    refresh();
  }

  // ---- UI sync --------------------------------------------------------------
  const zoneText = (v, z) => (v.text && v.text[z]) || ZONE_SUBS[z] || '';
  const fmt = val => (val == null ? 'OFF' : val + '%');

  function legalReport(v, film) {
    const issues = [], notes = [];
    const rearMin = v.cls === 'car' ? 15 : 6;
    const kind = v.cls === 'car' ? 'cars' : 'SUVs, trucks & vans';
    if (film.front != null && film.front < 28) issues.push(`Front sides at ${film.front}% are darker than Florida's 28% minimum.`);
    if (!v.noRear && film.rear != null && film.rear < rearMin) issues.push(`Rear sides at ${film.rear}% are under Florida's ${rearMin}% limit for ${kind}.`);
    if (film.back != null && film.back < rearMin) issues.push(`Back glass at ${film.back}% is under Florida's ${rearMin}% limit for ${kind}.`);
    if (film.windshield != null) notes.push('Florida allows windshield tint only above the AS-1 line. Ask us about clear ceramic windshield film and medical exemptions.');
    if (film.visor != null) notes.push('Visor strip stays above the AS-1 line, which is legal in Florida.');
    if (v.privacy && (film.rear != null || film.back != null)) notes.push('This vehicle\'s rear glass is usually factory privacy tinted, so film there ends up darker than its % alone.');
    return { issues, notes };
  }

  function summary(v) {
    const parts = [];
    const order = ['front', 'rear', 'back', 'windshield', 'visor'];
    order.forEach(z => {
      if (z === 'rear' && v.noRear) return;
      if (state.film[z] != null) parts.push(`${ZONE_LABELS[z]} ${state.film[z]}%`);
    });
    return `${v.badge}: ${parts.length ? parts.join(', ') : 'no film selected'}`;
  }

  function refresh() {
    const v = VEHICLES[state.vehicle];
    const film = state.film;

    // 3D glass
    ZONES.forEach(z => {
      const s = glassShade(netVlt(v, film, z));
      glassMats[z].color.setRGB(0.86 * s, 0.92 * s, 0.96 * s);
      if (current) {
        current.outlines[z].visible = z === state.zone;
        if (z === 'visor') current.zoneMeshes.visor.forEach(m => { m.visible = film.visor != null || state.zone === 'visor'; });
      }
    });

    // Vehicle tabs
    $$('[data-ts-vehicle]').forEach(b => { b.dataset.active = String(b.dataset.tsVehicle === state.vehicle); });
    const badge = $('#ts-vehicle-badge');
    if (badge) badge.textContent = v.badge;

    // Zone list
    $$('[data-ts-zone]').forEach(btn => {
      const z = btn.dataset.tsZone;
      const disabled = z === 'rear' && v.noRear;
      btn.disabled = disabled;
      btn.dataset.active = String(z === state.zone);
      btn.querySelector('[data-ts-zone-sub]').textContent = zoneText(v, z);
      btn.querySelector('[data-ts-zone-value]').textContent = disabled ? '—' : fmt(film[z]);
      btn.querySelector('[data-ts-zone-swatch]').style.background = disabled ? 'transparent' : cssGlass(netVlt(v, film, z));
    });

    // Shade picker
    const zoneName = $('#ts-zone-name');
    if (zoneName) zoneName.textContent = ZONE_LABELS[state.zone];
    const val = film[state.zone];
    $$('[data-ts-shade]').forEach(b => {
      const s = b.dataset.tsShade;
      b.dataset.active = String(s === 'off' ? val == null : Number(s) === val);
    });
    const slider = $('#ts-slider');
    if (slider) {
      slider.value = val ?? 70;
      slider.dataset.off = String(val == null);
    }

    // Florida law check
    const { issues, notes } = legalReport(v, film);
    const box = $('#ts-legal');
    if (box) {
      const ok = issues.length === 0;
      box.dataset.state = ok ? 'ok' : 'warn';
      $('#ts-legal-icon').textContent = ok ? '✓' : '!';
      $('#ts-legal-title').textContent = ok ? 'FLORIDA LEGAL SETUP' : 'CHECK FLORIDA TINT LAW';
      const list = $('#ts-legal-list');
      list.innerHTML = '';
      const lines = ok
        ? [`Meets Florida limits for ${v.cls === 'car' ? 'cars' : 'SUVs, trucks & vans'}: 28% front sides, ${v.cls === 'car' ? '15' : '6'}% rear.`, ...notes]
        : [...issues, ...notes];
      lines.forEach(t => { const li = document.createElement('li'); li.textContent = t; list.appendChild(li); });
    }

    // Performance specs for the selected zone
    const spec = film[state.zone];
    $('#ts-spec-vlt').textContent = spec == null ? '—' : spec + '%';
    $('#ts-spec-heat').textContent = spec == null ? '—' : Math.round(80 + (70 - spec) * 0.22) + '%';
    $('#ts-spec-glare').textContent = spec == null ? '—' : Math.round(100 - spec * 0.95) + '%';

    // Quote link
    const quote = $('#ts-quote');
    if (quote) quote.href = `contact.html?service=automotive&tint=${encodeURIComponent(summary(v))}`;
  }

  // ---- Interaction ----------------------------------------------------------
  function setShade(value) {
    if (state.zone === 'rear' && VEHICLES[state.vehicle].noRear) return;
    state.film[state.zone] = value;
    refresh();
  }

  $$('[data-ts-vehicle]').forEach(b => b.addEventListener('click', () => setVehicle(b.dataset.tsVehicle, true)));
  $$('[data-ts-view]').forEach(b => b.addEventListener('click', () => goToView(b.dataset.tsView)));
  $$('[data-ts-paint]').forEach(b => b.addEventListener('click', () => {
    paintMat.color.set(b.dataset.tsPaint);
    paintMat.metalness = b.dataset.tsPaint === '#0c0d10' ? 0.2 : 0.35;
    $$('[data-ts-paint]').forEach(o => { o.dataset.active = String(o === b); });
  }));
  $$('[data-ts-zone]').forEach(b => b.addEventListener('click', () => {
    state.zone = b.dataset.tsZone;
    if (state.zone === 'windshield' || state.zone === 'visor') goToView('3q');
    if (state.zone === 'back') goToView('rear');
    refresh();
  }));
  $$('[data-ts-shade]').forEach(b => b.addEventListener('click', () => {
    setShade(b.dataset.tsShade === 'off' ? null : Number(b.dataset.tsShade));
  }));
  $('#ts-slider')?.addEventListener('input', e => setShade(Number(e.target.value)));
  $$('[data-ts-preset]').forEach(b => b.addEventListener('click', () => {
    const f = state.film;
    if (b.dataset.tsPreset === 'legal') Object.assign(f, { front: 30, rear: 15, back: 15 });
    if (b.dataset.tsPreset === 'match') {
      const s = f[state.zone] ?? 30;
      Object.assign(f, { front: s, rear: s, back: s });
    }
    if (b.dataset.tsPreset === 'clear') ZONES.forEach(z => { f[z] = null; });
    refresh();
  }));

  // Tap a window in 3D to select it
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tooltip = $('#ts-tooltip');
  function pick(ev) {
    if (!current) return null;
    const r = canvas.getBoundingClientRect();
    pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Only solid, visible surfaces count (outlines are lines, and hidden objects still raycast)
    const hits = raycaster.intersectObjects([current.group], true).filter(h => h.object.isMesh && h.object.visible);
    // The glass has to be the nearest thing under the pointer, not glass behind the body
    return hits.length ? hits[0].object.userData.zone || null : null;
  }
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const z = pick(e);
    if (z) { state.zone = z; refresh(); }
  });
  canvas.addEventListener('pointermove', e => {
    if (e.buttons) { hovered = null; tooltip?.classList.add('hidden'); return; }
    hovered = e.pointerType === 'mouse' ? pick(e) : null;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (!tooltip) return;
    if (!hovered) { tooltip.classList.add('hidden'); return; }
    const r = stage.getBoundingClientRect();
    tooltip.textContent = `${ZONE_LABELS[hovered]} · ${fmt(state.film[hovered])}`;
    tooltip.style.left = (e.clientX - r.left + 14) + 'px';
    tooltip.style.top = (e.clientY - r.top + 14) + 'px';
    tooltip.classList.remove('hidden');
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; tooltip?.classList.add('hidden'); });

  // ---- Render loop ------------------------------------------------------------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let visible = true, running = false;
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    if (!visible) { running = false; return; }
    requestAnimationFrame(frame);
    if (tween) {
      const t = Math.min(1, (now - tween.t0) / tween.dur), k = ease(t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTgt, tween.toTgt, k);
      if (t >= 1) tween = null;
    }
    controls.update();
    outlineMat.opacity = 0.55 + 0.45 * Math.sin(now / 240);
    ZONES.forEach(z => {
      glassMats[z].emissiveIntensity = z === hovered && z !== state.zone ? 0.12 : 0;
    });
    renderer.render(scene, camera);
  }
  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(stage);

  setVehicle(state.vehicle, false);
  $$('[data-ts-paint]')[0]?.setAttribute('data-active', 'true');
  $('#ts-loading')?.classList.add('hidden');
  start();
}
