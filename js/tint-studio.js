// SolarShield Tint Studio: interactive 3D window tint preview for the home page.
//
// Every vehicle is generated from code. The body is lofted from cross-sections
// along its length (curved hood, roof and greenhouse with tumblehome), glass is
// laid onto that same surface so it sits flush, and the body under the glass is
// cut away so you see a real interior through it. Tint is shown as light
// actually passing through: light film shows the seats, limo film hides them.
//
// Axes: x = length (front of vehicle at +x), y = height, z = width
// (driver side at -z). Units are meters.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
const LOWER_N = 18;           // samples up the lower body side (fine enough for crisp creases)

// ---------------------------------------------------------------------------
// Vehicle library
//
// keys: body stations [x, b, s, T, c, w, g]
//   b = underside height, s = beltline (shoulder), T = top centerline height,
//   c = roof/hood crown, w = half width at the shoulder, g = half width at the
//   top edge (smaller than w gives the glass its inward lean)
// windows: side glass with front edge a[bottom, top] and rear edge b[bottom, top]
// shield / back: glass on the top surface between two x positions, or back
//   glass on the vertical rear face (type 'rear')
// ---------------------------------------------------------------------------
const VEHICLES = {
  sedan: {
    label: 'Sedan', badge: 'Midsize Sedan', cls: 'car', privacy: false, round: { noseIn: 0.10, noseDrop: 0.01, noseRise: 0.02, tailIn: 0.05, tailDrop: 0.0, tailRise: 0.02 },
    wheelR: 0.345, wheelX: [-1.395, 1.43], tireW: 0.235, rb: 0.07, rt: 0.08,
    keys: [
      [2.40, 0.33, 0.67, 0.71, 0.00, 0.78, 0.74],
      [2.33, 0.29, 0.725, 0.765, 0.01, 0.87, 0.82],
      [2.10, 0.27, 0.79, 0.835, 0.02, 0.91, 0.855],
      [1.40, 0.25, 0.86, 0.92, 0.03, 0.92, 0.85],
      [1.05, 0.24, 0.90, 0.965, 0.04, 0.925, 0.84],
      [0.60, 0.23, 0.93, 1.19, 0.05, 0.925, 0.79],
      [0.15, 0.23, 0.95, 1.41, 0.06, 0.925, 0.74],
      [-0.35, 0.23, 0.975, 1.445, 0.06, 0.925, 0.73],
      [-0.75, 0.23, 0.995, 1.40, 0.06, 0.925, 0.74],
      [-1.20, 0.24, 1.015, 1.24, 0.05, 0.92, 0.78],
      [-1.70, 0.25, 1.03, 1.08, 0.04, 0.905, 0.84],
      [-2.10, 0.27, 1.03, 1.07, 0.03, 0.89, 0.85],
      [-2.40, 0.31, 1.01, 1.055, 0.02, 0.87, 0.835],
      [-2.50, 0.34, 0.99, 1.035, 0.01, 0.83, 0.79]
    ],
    shield: [1.02, 0.17],
    back: { type: 'top', x: [-1.66, -0.80] },
    windows: [
      { zone: 'front', a: [0.96, 0.24], b: [-0.08, -0.08] },
      { zone: 'rear', a: [-0.18, -0.18], b: [-1.40, -0.92] }
    ],
    seams: [[1.06], [-0.13], [-1.22]], handles: [0.02, -1.00],
    mirror: { x: 0.88, s: 1 },
    head: { y: [0.60, 0.68], z: [0.40, 0.88] }, grille: { y: [0.36, 0.57], z: 0.44 }, headBar: true,
    tail: { y: [0.88, 0.97], z: [0.36, 0.90] }, tailBar: true, plate: [0.56, 0.70],
    seats: [{ x: 0.04, type: 'pair' }, { x: -0.86, type: 'bench' }], dash: 0.70, wheel: 0.45,
    rim: { spokes: 5, color: 0xc9ced5, caliper: 0x2b2e33, split: true },
    text: { rear: 'Rear door windows', back: 'Rear windshield' }
  },
  coupe: {
    label: 'Coupe', badge: 'Sports Coupe', cls: 'car', privacy: false, round: { noseIn: 0.11, noseDrop: 0.015, noseRise: 0.02, tailIn: 0.07, tailDrop: 0.01, tailRise: 0.03 },
    wheelR: 0.36, wheelX: [-1.25, 1.47], tireW: 0.265, rb: 0.07, rt: 0.08,
    keys: [
      [2.35, 0.32, 0.64, 0.68, 0.00, 0.80, 0.76],
      [2.27, 0.28, 0.71, 0.75, 0.01, 0.90, 0.86],
      [1.95, 0.25, 0.79, 0.845, 0.03, 0.95, 0.89],
      [1.30, 0.24, 0.86, 0.92, 0.05, 0.96, 0.88],
      [0.75, 0.23, 0.89, 0.96, 0.05, 0.96, 0.86],
      [0.35, 0.23, 0.92, 1.16, 0.05, 0.96, 0.80],
      [0.00, 0.23, 0.94, 1.33, 0.05, 0.96, 0.73],
      [-0.45, 0.23, 0.96, 1.38, 0.05, 0.96, 0.72],
      [-0.95, 0.23, 0.98, 1.30, 0.05, 0.97, 0.75],
      [-1.50, 0.24, 0.99, 1.12, 0.04, 0.97, 0.81],
      [-1.95, 0.26, 0.99, 1.015, 0.03, 0.95, 0.86],
      [-2.30, 0.30, 0.95, 0.99, 0.02, 0.91, 0.86],
      [-2.44, 0.36, 0.88, 0.93, 0.01, 0.85, 0.80]
    ],
    shield: [0.73, 0.06],
    back: { type: 'top', x: [-1.76, -0.86] },
    windows: [
      { zone: 'front', a: [0.68, 0.10], b: [-0.82, -0.62] },
      { zone: 'rear', a: [-0.92, -0.72], b: [-1.42, -1.05] }
    ],
    seams: [[0.80], [-0.92]], handles: [-0.62],
    mirror: { x: 0.66, s: 1 },
    head: { y: [0.57, 0.645], z: [0.40, 0.90] }, grille: { y: [0.35, 0.55], z: 0.40 },
    tail: { y: [0.77, 0.87], z: [0.34, 0.84], bars: 3 }, plate: [0.50, 0.64],
    seats: [{ x: -0.30, type: 'pair' }, { x: -1.08, type: 'bench', small: true }], dash: 0.44, wheel: 0.18,
    rim: { spokes: 5, color: 0x3a3d43, caliper: 0xb3161c, split: true, size: 0.76 },
    text: { rear: 'Rear quarter glass', back: 'Fastback glass' }
  },
  suv: {
    label: 'SUV', badge: 'Midsize SUV', cls: 'mpv', privacy: true, flare: true, cladding: 0.14, floatRoof: true, round: { noseIn: 0.07, noseDrop: 0.01, noseRise: 0.02, tailIn: 0.05, tailDrop: 0.02, tailRise: 0.03 },
    wheelR: 0.385, wheelX: [-1.36, 1.33], tireW: 0.245, rb: 0.07, rt: 0.065, roll: 0.025, archGap: 0.05,
    keys: [
      [2.25, 0.53, 0.82, 0.88, 0, 0.78, 0.74],
      [2.17, 0.48, 0.91, 0.97, 0.01, 0.88, 0.84],
      [1.8, 0.45, 1.02, 1.09, 0.02, 0.93, 0.88],
      [1.1, 0.44, 1.03, 1.1, 0.03, 0.93, 0.87],
      [0.8, 0.43, 1.05, 1.13, 0.04, 0.93, 0.86],
      [0.4, 0.43, 1.07, 1.42, 0.05, 0.93, 0.8],
      [0.05, 0.43, 1.08, 1.68, 0.05, 0.93, 0.77],
      [-0.6, 0.43, 1.1, 1.7, 0.05, 0.93, 0.77],
      [-1.6, 0.44, 1.15, 1.67, 0.05, 0.93, 0.77],
      [-2.1, 0.46, 1.17, 1.61, 0.05, 0.92, 0.78],
      [-2.28, 0.49, 1.15, 1.55, 0.04, 0.9, 0.78],
      [-2.35, 0.53, 1.1, 1.47, 0.03, 0.86, 0.76]
    ],
    shield: [0.78, 0.10],
    back: { type: 'rear', y: [1.17, 1.41], z: [[-0.84, 0.84]] },
    windows: [
      { zone: 'front', a: [0.76, 0.12], b: [-0.02, -0.02] },
      { zone: 'rear', a: [-0.12, -0.12], b: [-1.02, -1.02] },
      { zone: 'rear', a: [-1.12, -1.12], b: [-2.02, -1.80] }
    ],
    seams: [[0.86], [-0.07], [-1.08]], handles: [0.05, -0.95],
    mirror: { x: 0.74, s: 1.1 },
    head: { y: [0.80, 0.88], z: [0.38, 0.90] }, grille: { y: [0.53, 0.78], z: 0.48 }, headBar: true,
    tail: { y: [1.02, 1.12], z: [0.40, 0.92] }, tailBar: true, plate: [0.64, 0.78],
    rails: [-1.95, 0.20],
    seats: [{ x: -0.18, type: 'pair' }, { x: -1.12, type: 'bench' }], dash: 0.52, wheel: 0.30,
    rim: { spokes: 6, color: 0x2e3136, caliper: 0x2b2e33, size: 0.73 },
    text: { rear: 'Rear doors & quarter glass', back: 'Liftgate glass' }
  },
  truck: {
    label: 'Truck', badge: 'Crew Cab Pickup', cls: 'mpv', privacy: true, creases: false,
    round: { noseIn: 0.025, noseLen: 0.22, noseDrop: 0, noseRise: 0.02, tailIn: 0, tailDrop: 0, tailRise: 0 },
    wheelR: 0.44, wheelX: [-1.71, 1.97], tireW: 0.29, rb: 0.045, rt: 0.045, tuck: 0.025, roll: 0.006, flare: true, archGap: 0.06,
    keys: [
      [2.96, 0.6, 1.19, 1.235, 0, 0.995, 0.975],
      [2.86, 0.56, 1.22, 1.265, 0.004, 1.005, 0.985],
      [2.3, 0.56, 1.265, 1.305, 0.008, 1.01, 0.99],
      [1.2, 0.56, 1.305, 1.345, 0.01, 1.01, 0.99],
      [0.8, 0.56, 1.325, 1.36, 0.01, 1.01, 0.985],
      [0.46, 0.56, 1.36, 1.63, 0.018, 1.01, 0.93],
      [0.12, 0.56, 1.38, 1.935, 0.02, 1.01, 0.905],
      [-0.6, 0.56, 1.38, 1.96, 0.02, 1.01, 0.905],
      [-0.98, 0.56, 1.38, 1.955, 0.02, 1.01, 0.905],
      [-1.04, 0.57, 1.37, 1.93, 0.018, 1, 0.9]
    ],
    shield: [0.78, 0.15],
    back: { type: 'rear', y: [1.47, 1.84], z: [[-0.58, 0.58]] },
    windows: [
      { zone: 'front', a: [0.74, 0.16], b: [-0.07, -0.07] },
      { zone: 'rear', a: [-0.17, -0.17], b: [-0.94, -0.94] }
    ],
    seams: [[0.84], [-0.12], [-0.99]], handles: [-0.02, -0.88],
    mirror: { x: 0.70, s: 1.4, tall: true, black: true },
    head: { y: [1.03, 1.21], z: [0.60, 0.99] }, grille: { y: [0.75, 1.21], z: 0.60, chrome: true },
    bumper: { y: [0.56, 0.74], chrome: true },
    bed: { x: [-2.94, -1.08], b: 0.60, rail: 1.33, floor: 1.0, w: 1.01, wall: 0.06 },
    runningBoard: true,
    seats: [{ x: -0.06, type: 'pair' }, { x: -0.80, type: 'bench' }], dash: 0.55, wheel: 0.32,
    rim: { spokes: 6, color: 0xb3b8c0, caliper: 0x2b2e33, size: 0.66 },
    text: { rear: 'Rear door windows', back: 'Rear cab slider' }
  },
  van: {
    label: 'Work Van', badge: 'High-Roof Work Van', cls: 'mpv', privacy: false, noRear: true, creases: false, round: { noseIn: 0.08, noseLen: 0.6, tailIn: 0.025, tailLen: 0.3, tailRise: 0.02, tailDrop: 0.01 },
    wheelR: 0.38, wheelX: [-1.71, 2.04], tireW: 0.235, rb: 0.08, rt: 0.12,
    keys: [
      [2.99, 0.45, 0.85, 0.95, 0.00, 0.92, 0.88],
      [2.92, 0.42, 0.98, 1.06, 0.01, 0.98, 0.94],
      [2.55, 0.40, 1.10, 1.17, 0.02, 1.00, 0.96],
      [2.00, 0.40, 1.16, 1.26, 0.03, 1.01, 0.96],
      [1.75, 0.40, 1.18, 1.62, 0.04, 1.01, 0.95],
      [1.50, 0.40, 1.20, 2.05, 0.05, 1.01, 0.95],
      [1.20, 0.40, 1.22, 2.48, 0.06, 1.02, 0.96],
      [0.85, 0.40, 1.22, 2.70, 0.06, 1.02, 0.97],
      [-2.85, 0.42, 1.22, 2.72, 0.06, 1.02, 0.97],
      [-2.99, 0.46, 1.20, 2.66, 0.05, 0.99, 0.94]
    ],
    shield: [1.98, 1.53],
    back: { type: 'rear', y: [1.55, 2.12], z: [[-0.90, -0.06], [0.06, 0.90]] },
    windows: [
      { zone: 'front', a: [1.92, 1.56], b: [1.06, 1.06], yTop: 1.98 }
    ],
    seams: [[1.99], [0.99, 2.40], [0.90, 2.40], [-0.62, 2.40]], handles: [1.10, 0.75],
    mirror: { x: 1.90, s: 1.5, tall: true, black: true },
    head: { y: [0.78, 0.92], z: [0.56, 0.95] }, grille: { y: [0.52, 0.76], z: 0.52 },
    bumper: { y: [0.45, 0.53] }, rearBumper: [0.46, 0.58], rearDoorSeam: true,
    tail: { y: [0.95, 1.45], z: [0.88, 0.965] }, plate: [0.62, 0.76],
    seats: [{ x: 1.30, type: 'pair' }], bulkhead: 0.92, dash: 1.74, wheel: 1.55,
    rim: { spokes: 6, color: 0x8f959e, caliper: 0x2b2e33, steel: true },
    text: { rear: 'Cargo area has no side glass', back: 'Rear door windows' }
  },
  minivan: {
    label: 'Minivan', badge: 'Minivan', cls: 'mpv', privacy: true, floatRoof: true, round: { noseIn: 0.09, noseDrop: 0.015, noseRise: 0.02, tailIn: 0.05, tailDrop: 0.02, tailRise: 0.03 },
    wheelR: 0.36, wheelX: [-1.52, 1.57], tireW: 0.235, rb: 0.07, rt: 0.07, roll: 0.025,
    keys: [
      [2.55, 0.40, 0.69, 0.74, 0.00, 0.80, 0.76],
      [2.47, 0.35, 0.80, 0.85, 0.01, 0.92, 0.88],
      [2.05, 0.32, 0.93, 0.99, 0.02, 0.98, 0.93],
      [1.45, 0.31, 1.00, 1.06, 0.03, 0.99, 0.92],
      [1.00, 0.31, 1.03, 1.40, 0.05, 0.99, 0.85],
      [0.55, 0.31, 1.05, 1.74, 0.05, 0.99, 0.80],
      [-0.50, 0.31, 1.07, 1.78, 0.05, 0.99, 0.80],
      [-1.80, 0.32, 1.08, 1.76, 0.05, 0.99, 0.80],
      [-2.40, 0.34, 1.07, 1.70, 0.05, 0.97, 0.80],
      [-2.63, 0.40, 1.03, 1.60, 0.04, 0.92, 0.78]
    ],
    shield: [1.43, 0.62],
    back: { type: 'rear', y: [1.10, 1.52], z: [[-0.86, 0.86]] },
    windows: [
      { zone: 'front', a: [1.38, 0.66], b: [0.36, 0.36] },
      { zone: 'rear', a: [0.26, 0.26], b: [-0.86, -0.86] },
      { zone: 'rear', a: [-0.96, -0.96], b: [-2.30, -2.14] }
    ],
    seams: [[1.46], [0.31], [-0.91]], handles: [0.40, 0.18],
    mirror: { x: 1.36, s: 1.15 },
    head: { y: [0.62, 0.70], z: [0.38, 0.92] }, grille: { y: [0.43, 0.59], z: 0.46 }, headBar: true,
    tail: { y: [0.98, 1.08], z: [0.45, 0.95] }, tailBar: true, plate: [0.62, 0.76],
    seats: [{ x: 0.25, type: 'pair' }, { x: -0.68, type: 'pair' }, { x: -1.66, type: 'bench' }], dash: 1.04, wheel: 0.80,
    rim: { spokes: 5, color: 0xb9bec6, caliper: 0x2b2e33 },
    text: { rear: 'Sliding door & quarter glass', back: 'Liftgate glass' }
  }
};

const VIEWS = {
  '3q': [1.0, 0.3, -1.05],
  side: [0.0001, 0.14, -1],
  front: [1, 0.2, -0.0001],
  rear: [-1.0, 0.32, -0.95]
};

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------
const paintMat = new THREE.MeshPhysicalMaterial({
  color: 0xf2f4f7, metalness: 0.35, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.12,
  vertexColors: true, side: THREE.DoubleSide
});
// Inside faces of the body (seen through the glass) read as dark trim, not paint
paintMat.onBeforeCompile = shader => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    'if (!gl_FrontFacing) gl_FragColor.rgb *= 0.1;\n#include <dithering_fragment>'
  );
};
const trimMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.45, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
const plasticMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe6e9ee, roughness: 0.08, metalness: 1, side: THREE.DoubleSide });
const fritMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.15, metalness: 0, clearcoat: 1, side: THREE.DoubleSide });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9, metalness: 0 });
const discMat = new THREE.MeshStandardMaterial({ color: 0x6b6e73, roughness: 0.45, metalness: 0.9 });
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide });
const headLensMat = new THREE.MeshPhysicalMaterial({ color: 0x6d7682, emissive: 0xdfe9ff, emissiveIntensity: 0.06, roughness: 0.05, metalness: 0.6, clearcoat: 1, side: THREE.DoubleSide });
const headHousingMat = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide });
const drlMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff, side: THREE.DoubleSide });
const tailMat = new THREE.MeshPhysicalMaterial({ color: 0x5c0609, emissive: 0xc0101a, emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide });
const plateMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f0, roughness: 0.5, side: THREE.DoubleSide });
const seatMat = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.85 });
const dashMat = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.7 });
// Honeycomb mesh for grilles and intakes
const grilleMat = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#050506';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#3a3d44';
  g.lineWidth = 5;
  const r = 16, h = r * Math.sqrt(3);
  for (let row = -1; row < 5; row++) for (let col = -1; col < 6; col++) {
    const cx = col * r * 3 + (row % 2 ? r * 1.5 : 0), cy = row * h / 2;
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 3 * k;
      g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    g.closePath();
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 3);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.4, side: THREE.DoubleSide });
})();
const outlineMat = new THREE.LineBasicMaterial({ color: 0xffd000, transparent: true, opacity: 0.95 });

// Glass is two layers: a dark filter whose opacity is the tint (light that does
// not get through), plus an additive reflection layer that is the same at any shade.
const tintMats = Object.fromEntries(ZONES.map(z => [z, new THREE.MeshBasicMaterial({
  color: 0x040608, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide
})]));
const reflectMat = new THREE.MeshPhysicalMaterial({
  color: 0x000000, roughness: 0.03, metalness: 0, envMapIntensity: 1.25,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide
});

// ---------------------------------------------------------------------------
// Studio environment: dark room with softboxes, for realistic paint highlights
// ---------------------------------------------------------------------------
function studioEnvironment() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: 0x06080c, side: THREE.BackSide })));
  const panel = (w, h, power, pos, tint = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0.8, 0);
    env.add(m);
  };
  panel(26, 14, 0.75, [0, 11, 0]);               // broad, soft overhead
  panel(18, 3, 1.3, [0, 4.5, 11]);                // side strip (passenger)
  panel(18, 3, 1.3, [0, 4.5, -11]);               // side strip (driver)
  panel(3, 9, 0.9, [12, 3.5, -5]);                // front corners
  panel(3, 9, 0.9, [12, 3.5, 5]);
  panel(10, 5, 0.7, [13, 2.2, 0]);                // front fill
  panel(10, 5, 0.8, [-13, 3, 0], 0x7fb0ff);       // cool rim from behind
  panel(40, 40, 0.16, [0, -1.5, 0], 0x8f9bb0);    // floor bounce lifts the lower body
  return env;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Monotone cubic interpolation (no overshoot between stations)
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ---------------------------------------------------------------------------
// Body cross-section (right half, from underside center to roof center)
// ---------------------------------------------------------------------------
function makeSectioner(v) {
  const keys = [...v.keys].sort((a, b) => a[0] - b[0]);
  const xs = keys.map(k => k[0]);
  const f = ['b', 's', 'T', 'c', 'w', 'g'].map((_, i) => monotone(xs, keys.map(k => k[i + 1])));
  const xLo = xs[0], xHi = xs[xs.length - 1];
  const r = v.round || {};
  // Round both ends: over the last stretch the body narrows, the top drops and the chin tucks up
  const params = x => {
    const nf = clamp((x - (xHi - (r.noseLen ?? 0.5))) / (r.noseLen ?? 0.5), 0, 1) ** 2;
    const tf = clamp(((xLo + (r.tailLen ?? 0.45)) - x) / (r.tailLen ?? 0.45), 0, 1) ** 2;
    const k = 1 - (r.noseIn ?? 0.12) * nf - (r.tailIn ?? 0.08) * tf;
    const T = f[2](x) - (r.noseDrop ?? 0.04) * nf - (r.tailDrop ?? 0.02) * tf;
    return {
      b: f[0](x) + (r.noseRise ?? 0.05) * nf + (r.tailRise ?? 0.05) * tf,
      s: Math.min(f[1](x) - (r.noseDrop ?? 0.04) * nf * 0.8, T - 0.02),
      T, c: f[3](x), w: f[4](x) * k, g: f[5](x) * k
    };
  };
  const cache = new Map();

  function section(x) {
    const key = Math.round(x * 2000);
    if (cache.has(key)) return cache.get(key);
    const { b, s, T, c, w, g } = params(x);
    const wl = w - (v.tuck ?? 0.06);
    const rbE = Math.max(0.02, Math.min(v.rb, (s - b) * 0.45));
    const e0 = Math.max(T - c, s + 0.012);
    const rtE = Math.max(0.01, Math.min(v.rt, (e0 - s) * 0.55, g * 0.3));
    const e = e0 - rtE, hr = g - rtE;
    const pts = [];
    for (let i = 0; i < 4; i++) pts.push([(wl - rbE) * i / 3, b, 'bottom']);
    for (let i = 1; i <= 5; i++) {
      const a = -Math.PI / 2 + (Math.PI / 2) * i / 5;
      pts.push([wl - rbE + rbE * Math.cos(a), b + rbE + rbE * Math.sin(a), 'arc']);
    }
    const roll = (v.roll ?? 0.035) * clamp((s - b - 0.2) / 0.3, 0, 1);
    // Modern feature lines: a crisp shoulder crease and a sculpted lower-door scoop,
    // both rising slightly toward the rear. Faded out over the nose and tail.
    const lines = v.creases === false ? 0 : clamp((s - b - 0.3) / 0.15, 0, 1) * clamp(Math.min(xHi - x, x - xLo) / 0.4, 0, 1);
    const rise = -x / 2.4;
    const yc1 = s - 0.12 + 0.025 * rise;
    const yc2 = b + rbE + (s - b - rbE) * 0.3 + 0.05 * rise;
    for (let i = 1; i <= LOWER_N; i++) {
      const t = i / LOWER_N, y = b + rbE + (s - b - rbE) * t;
      let z = t < 0.65 ? w - (w - wl) * (1 - t / 0.65) ** 2 : w - roll * ((t - 0.65) / 0.35) ** 2;
      z += lines * 0.011 * Math.max(0, 1 - Math.abs(y - yc1) / 0.03);
      z -= lines * 0.013 * Math.max(0, 1 - Math.abs(y - yc2) / 0.09) * (y < yc2 ? 0.6 : 1);
      pts.push([z, y, 'lower']);
    }
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      pts.push([w - roll + (g - w + roll) * t + 0.012 * Math.sin(Math.PI * t) * Math.min(1, (e - s) / 0.2), s + (e - s) * t, 'green']);
    }
    for (let i = 1; i <= 6; i++) {
      const a = (Math.PI / 2) * i / 6;
      pts.push([hr + rtE * Math.cos(a), e + rtE * Math.sin(a), 'corner']);
    }
    for (let i = 1; i <= 10; i++) {
      const z = hr * (1 - i / 10);
      pts.push([z, T - c * (z / hr) ** 2, 'roof']);
    }
    const out = { pts, b, s, T, c, w, g, e, e0, hr, rtE, rbE };
    cache.set(key, out);
    return out;
  }

  // Half width of the body side at height y
  function zAt(x, y) {
    const { pts } = section(x);
    const lo = 4, hi = 4 + 5 + LOWER_N + 12 + 6 - 1;   // arc start .. end of roof corner
    if (y <= pts[lo][1]) return pts[lo][0];
    if (y >= pts[hi][1]) return pts[hi][0];
    for (let i = lo; i < hi; i++) {
      const p = pts[i], q = pts[i + 1];
      if (y >= p[1] && y <= q[1]) return q[1] === p[1] ? Math.max(p[0], q[0]) : lerp(p[0], q[0], (y - p[1]) / (q[1] - p[1]));
    }
    return pts[hi][0];
  }
  // Height of the top surface (hood, windshield, roof, back glass) at (x, z)
  function topY(x, z) {
    const sc = section(x);
    const t = Math.min(1, Math.abs(z) / sc.hr);
    return sc.T - sc.c * t * t;
  }
  // Is (y, z) inside the body cross-section at x?
  function inside(x, y, z) {
    const sc = section(x);
    if (y < sc.b - 1e-4 || y > sc.T) return false;
    const az = Math.abs(z);
    if (az > zAt(x, y)) return false;
    return !(az <= sc.hr && y > topY(x, z));
  }
  // x of the front (dir 1) or rear (dir -1) surface at (y, z), so parts wrap around corners
  function endX(y, z, dir) {
    const xEnd = dir > 0 ? xHi : xLo;
    if (inside(xEnd, y, z)) return xEnd;
    let a = xEnd - dir * 1.0, b = xEnd;
    if (!inside(a, y, z)) return a;
    for (let i = 0; i < 22; i++) {
      const m = (a + b) / 2;
      if (inside(m, y, z)) a = m; else b = m;
    }
    return (a + b) / 2;
  }
  return { section, zAt, topY, params, endX, xMin: xLo, xMax: xHi };
}

// ---------------------------------------------------------------------------
// Parametric patches laid onto the body (glass, lights, trim)
// ---------------------------------------------------------------------------
function patchGeometry(fn, nu, nv) {
  const pos = [], idx = [], uv = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { pos.push(...fn(i / nu, j / nv)); uv.push(i / nu, j / nv); }
  const row = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * row + i;
    idx.push(a, a + 1, a + row + 1, a, a + row + 1, a + row);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function boundaryLoop(fn, n = 24) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(fn(i / n, 0));
  for (let i = 0; i < n; i++) pts.push(fn(1, i / n));
  for (let i = n; i > 0; i--) pts.push(fn(i / n, 1));
  for (let i = n; i > 0; i--) pts.push(fn(0, i / n));
  return pts;
}

function patchSize(fn) {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return [d(fn(0, 0.5), fn(1, 0.5)) || 0.01, d(fn(0.5, 0), fn(0.5, 1)) || 0.01];
}

// Border band around a patch (black ceramic frit on glass, light bezels, grille frames)
function frameGeometry(fn, width, n = 24) {
  const [su, sv] = patchSize(fn);
  const du = Math.min(0.45, width / su), dv = Math.min(0.45, width / sv);
  const outer = [], inner = [];
  const push = (u, v) => { outer.push(fn(u, v)); inner.push(fn(clamp(u, du, 1 - du), clamp(v, dv, 1 - dv))); };
  for (let i = 0; i < n; i++) push(i / n, 0);
  for (let i = 0; i < n; i++) push(1, i / n);
  for (let i = n; i > 0; i--) push(i / n, 1);
  for (let i = n; i > 0; i--) push(0, i / n);
  const pos = [], idx = [], m = outer.length;
  outer.forEach(p => pos.push(...p));
  inner.forEach(p => pos.push(...p));
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    idx.push(i, j, m + j, i, m + j, m + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Wheels: rounded tire, deep barrel, brake disc + caliper, spoked face
// ---------------------------------------------------------------------------
const wheelCache = new Map();
function wheelParts(R, w, rim) {
  const key = [R, w, rim.spokes, rim.color, rim.caliper, rim.split, rim.steel, rim.size].join('|');
  if (wheelCache.has(key)) return wheelCache.get(key);
  const rimR = R * (rim.size ?? 0.74);
  const faceMat = new THREE.MeshPhysicalMaterial({ color: rim.color, roughness: rim.steel ? 0.5 : 0.22, metalness: 0.85, clearcoat: rim.steel ? 0 : 0.8 });
  const parts = [];
  const prof = [
    [rimR, -w / 2 + 0.012], [R * 0.9, -w / 2], [R * 0.97, -w / 2 + 0.018], [R, -w / 2 + 0.06],
    [R, w / 2 - 0.06], [R * 0.97, w / 2 - 0.018], [R * 0.9, w / 2], [rimR, w / 2 - 0.012]
  ].map(p => new THREE.Vector2(p[0], p[1]));
  const tire = new THREE.LatheGeometry(prof, 72);
  tire.rotateX(Math.PI / 2);
  parts.push([tire, tireMat]);
  const barrel = new THREE.CylinderGeometry(rimR * 0.97, rimR * 0.97, w * 0.86, 48, 1, true);
  barrel.rotateX(Math.PI / 2);
  parts.push([barrel, barrelMat]);
  const back = new THREE.CircleGeometry(rimR * 0.97, 40);
  back.translate(0, 0, -w * 0.3);
  parts.push([back, barrelMat]);
  const disc = new THREE.CylinderGeometry(rimR * 0.8, rimR * 0.8, 0.024, 48);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, 0, w * 0.05);
  parts.push([disc, discMat]);
  const caliper = new THREE.BoxGeometry(rimR * 0.34, rimR * 0.5, 0.07);
  caliper.translate(rimR * 0.66, 0, w * 0.1);
  caliper.rotateZ(Math.PI * 0.8);
  parts.push([caliper, new THREE.MeshStandardMaterial({ color: rim.caliper, roughness: 0.4, metalness: 0.3 })]);
  const lip = new THREE.TorusGeometry(rimR * 0.985, 0.013, 10, 64);
  lip.translate(0, 0, w * 0.43);
  parts.push([lip, faceMat]);
  // Spokes: tapered blades from the hub to the rim lip, slightly dished
  const n = rim.spokes;
  const blades = rim.split ? n * 2 : n;
  for (let i = 0; i < blades; i++) {
    const sh = new THREE.Shape();
    const r0 = 0.075, r1 = rimR * 0.97, w0 = rim.split ? 0.022 : 0.04, w1 = rim.split ? 0.03 : rim.steel ? 0.075 : 0.058;
    sh.moveTo(r0, -w0 / 2); sh.lineTo(r1, -w1 / 2); sh.lineTo(r1, w1 / 2); sh.lineTo(r0, w0 / 2); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2 });
    g.rotateY(-0.12);
    const base = (Math.floor(rim.split ? i / 2 : i) / n) * Math.PI * 2;
    const ang = rim.split ? base + (i % 2 ? -0.3 : 0) : base;
    g.rotateZ(ang);
    g.translate(0, 0, w * 0.36);
    parts.push([g, faceMat]);
  }
  const hub = new THREE.CylinderGeometry(0.085, 0.09, 0.05, 32);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, 0, w * 0.4);
  parts.push([hub, faceMat]);
  const cap = new THREE.CylinderGeometry(0.038, 0.038, 0.06, 24);
  cap.rotateX(Math.PI / 2);
  cap.translate(0, 0, w * 0.41);
  parts.push([cap, chromeMat]);
  for (let i = 0; i < 5; i++) {
    const nut = new THREE.CylinderGeometry(0.011, 0.011, 0.06, 8);
    nut.rotateX(Math.PI / 2);
    const a = (i / 5) * Math.PI * 2 + 0.3;
    nut.translate(Math.cos(a) * 0.058, Math.sin(a) * 0.058, w * 0.41);
    parts.push([nut, chromeMat]);
  }
  wheelCache.set(key, parts);
  return parts;
}

function wheel(R, w, rim) {
  const g = new THREE.Group();
  wheelParts(R, w, rim).forEach(([geo, mat]) => g.add(new THREE.Mesh(geo, mat)));
  return g;
}

// ---------------------------------------------------------------------------
// Vehicle construction
// ---------------------------------------------------------------------------
function buildVehicle(v) {
  const flatEnds = v.keys.map(k => {
    const [x, b, s, T, c, w, g] = k;
    const hood = x > v.shield[0] + 0.04;
    const deck = v.back.type === 'top' && x < v.back.x[0] - 0.04;
    return hood || deck ? [x, b, s, T, c, w, Math.max(g, w - 0.03)] : k;
  });
  const S = makeSectioner({ ...v, keys: flatEnds });
  const group = new THREE.Group();
  const zoneMeshes = Object.fromEntries(ZONES.map(z => [z, []]));
  const outlines = Object.fromEntries(ZONES.map(z => [z, new THREE.Group()]));
  const halfW = Math.max(...v.keys.map(k => k[5]));
  const zIn = halfW - v.tireW - 0.07;
  const archR = v.wheelR + (v.archGap ?? 0.04);
  const GLASS_OFF = 0.004;

  // ---- glass regions (shared by the glass patches and the cutouts in the body)
  const winBounds = (win, x) => {
    const sc = S.section(x);
    // glass runs up into the rounded roof edge, leaving only a thin roof rail
    return [sc.s + 0.022, Math.min(sc.e0 - 0.035, win.yTop ?? 9)];
  };
  const sideFn = (win, side, off) => (u, t) => {
    const x = lerp(lerp(win.a[0], win.b[0], u), lerp(win.a[1], win.b[1], u), t);
    const [y0, y1] = winBounds(win, x);
    const y = lerp(y0, y1, t);
    return [x, y, side * (S.zAt(x, y) + off)];
  };
  const pillar = 0.05;
  // Glass half width: roof width at the top edge, flaring slightly toward the base
  const glassHW = (x, x0, x1) => {
    const frac = clamp((x - x1) / (x0 - x1), 0, 1);
    return Math.min(S.section(x).hr - pillar, S.section(x1).hr - pillar + 0.16 * frac + 0.02);
  };
  const topFn = (x0, x1, off, v0 = 0, v1 = 1) => (u, t) => {
    const x = lerp(x0, x1, lerp(v0, v1, t));
    const hw = glassHW(x, x0, x1);
    const z = lerp(-hw, hw, u);
    return [x, S.topY(x, z) + off, z];
  };
  const xRear = S.xMin, xFront = S.xMax;
  const capFn = (xCap, dir, y0, y1, zr, off) => (u, t) => {
    const y = lerp(y0, y1, t);
    const zm = S.zAt(xCap, y) - 0.06;
    return [xCap + dir * off, y, lerp(zr[0] * zm, zr[1] * zm, u)];
  };

  function inGlass(x, y, z, kind) {
    const m = 0.035;
    if (kind === 'green' || kind === 'lower' || kind === 'corner') {
      for (const win of v.windows) {
        const [y0, y1] = winBounds(win, x);
        const t = (y - y0) / (y1 - y0);
        if (t * (y1 - y0) < m || (1 - t) * (y1 - y0) < m) continue;
        const xa = lerp(win.a[0], win.a[1], t), xb = lerp(win.b[0], win.b[1], t);
        if (x < xa - m && x > xb + m) return true;
      }
    }
    if (kind === 'roof') {
      const inTop = (x0, x1) => {
        const lo = Math.min(x0, x1) + m, hi = Math.max(x0, x1) - m;
        return x > lo && x < hi && Math.abs(z) < glassHW(x, x0, x1) - m;
      };
      if (inTop(v.shield[0], v.shield[1])) return true;
      if (v.back.type === 'top' && inTop(v.back.x[0], v.back.x[1])) return true;
    }
    return false;
  }

  // Wheel openings: everything outboard of the wheel well inside the arch circle
  function inArch(x, y, z) {
    if (Math.abs(z) < zIn - 0.02) return false;
    return v.wheelX.some(wx => Math.hypot(x - wx, y - v.wheelR) < archR);
  }

  // ---- lofted body
  const len = xFront - xRear;
  const N = Math.ceil(len / 0.022);
  const ringRight = S.section(xRear).pts.length;          // 47
  const ring = ringRight * 2 - 2;
  const pos = new Float32Array((N + 1) * ring * 3);
  const col = new Float32Array((N + 1) * ring * 3);
  const kinds = [];
  for (let i = 0; i <= N; i++) {
    const x = xRear + (len * i) / N;
    const sc = S.section(x);
    const right = sc.pts;
    const left = right.slice(1, -1).reverse().map(([z, y, k]) => [-z, y, k]);
    const all = right.concat(left);
    all.forEach(([z, y, k], j) => {
      const px = x, py = y, pz = z;
      let shade = 1;
      if (k === 'bottom') shade = 0.18;
      // soft ambient occlusion low on the body
      shade *= 0.72 + 0.28 * clamp((py - sc.b) / 0.28, 0, 1);
      const o = (i * ring + j) * 3;
      pos[o] = px; pos[o + 1] = py; pos[o + 2] = pz;
      col[o] = col[o + 1] = col[o + 2] = shade;
      if (i === 0) kinds.push(k);
    });
  }
  const idx = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < ring; j++) {
      const jn = (j + 1) % ring;
      const a = i * ring + j, b = (i + 1) * ring + j, c = (i + 1) * ring + jn, d = i * ring + jn;
      const ka = kinds[j], kb = kinds[jn];
      const k = ka === kb ? ka : (ka === 'roof' || kb === 'roof' ? 'roof' : ka === 'green' || kb === 'green' ? 'green' : ka === 'corner' || kb === 'corner' ? 'corner' : ka);
      const cx = (pos[a * 3] + pos[c * 3]) / 2, cy = (pos[a * 3 + 1] + pos[c * 3 + 1]) / 2, cz = (pos[a * 3 + 2] + pos[c * 3 + 2]) / 2;
      if (inGlass(cx, cy, cz, k)) continue;
      if (inArch(cx, cy, cz)) continue;
      idx.push(a, b, c, a, c, d);
    }
  }
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  bodyGeo.setIndex(idx);
  bodyGeo.computeVertexNormals();
  group.add(new THREE.Mesh(bodyGeo, paintMat));

  // ---- end caps (front fascia, rear face), with cutouts for rear glass
  function cap(xCap, dir) {
    const sc = S.section(xCap);
    const rows = sc.pts.slice(3);              // from the bottom edge up to roof center
    const C = 18, cpos = [], ccol = [], cidx = [];
    rows.forEach(([zr, y]) => {
      for (let c = 0; c <= C; c++) {
        cpos.push(xCap, y, lerp(-zr, zr, c / C));
        const sh = 0.72 + 0.28 * clamp((y - sc.b) / 0.28, 0, 1);
        ccol.push(sh, sh, sh);
      }
    });
    const W1 = C + 1;
    const rearGlass = dir < 0 && v.back.type === 'rear' ? v.back : null;
    for (let r = 0; r < rows.length - 1; r++) for (let c = 0; c < C; c++) {
      const a = r * W1 + c, b = a + 1, cc = a + W1 + 1, d = a + W1;
      if (rearGlass) {
        const y = (cpos[a * 3 + 1] + cpos[cc * 3 + 1]) / 2, z = (cpos[a * 3 + 2] + cpos[cc * 3 + 2]) / 2;
        const m = 0.035;
        const zm = S.zAt(xCap, y) - 0.06;
        const hit = y > rearGlass.y[0] + m && y < rearGlass.y[1] - m &&
          rearGlass.z.some(([z0, z1]) => z > z0 * zm + m && z < z1 * zm - m);
        if (hit) continue;
      }
      if (dir > 0) cidx.push(a, cc, b, a, d, cc); else cidx.push(a, b, cc, a, cc, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(ccol, 3));
    g.setIndex(cidx);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, paintMat));
  }
  cap(xFront, 1);
  cap(xRear, -1);

  // ---- wheel arch lips (black flares on the truck) and wheel-well liners
  v.wheelX.filter(wx => wx > xRear + 0.1 && wx < xFront - 0.1).forEach(wx => {
    const yb = S.section(wx).b + 0.01;
    const ta = Math.asin(clamp((yb - v.wheelR) / archR, -1, 1));
    const n = 64;
    [-1, 1].forEach(side => {
      const lipW = v.flare ? 0.08 : 0.03, lipOut = v.flare ? 0.035 : 0.008;
      const lp = [], li = [], lc = [], np = [], ni = [];
      for (let i = 0; i <= n; i++) {
        const th = lerp(ta, Math.PI - ta, i / n), cs = Math.cos(th), sn = Math.sin(th);
        for (let r = 0; r <= 2; r++) {
          const rad = archR - 0.03 + (lipW + 0.03) * r / 2;
          const x = wx + rad * cs, y = v.wheelR + rad * sn;
          const bulge = r === 0 ? 1 : r === 1 ? 0.75 : 0;
          lp.push(x, y, side * (S.zAt(x, y) + 0.002 + lipOut * bulge));
          lc.push(1, 1, 1);
        }
        const x = wx + archR * cs, y = v.wheelR + archR * sn;
        np.push(x, y, side * (S.zAt(x, y) + 0.003), x, y, side * zIn);
      }
      for (let i = 0; i < n; i++) {
        for (let r = 0; r < 2; r++) {
          const a = i * 3 + r;
          li.push(a, a + 3, a + 4, a, a + 4, a + 1);
        }
        const b = i * 2;
        ni.push(b, b + 2, b + 3, b, b + 3, b + 1);
      }
      const lipGeo = new THREE.BufferGeometry();
      lipGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
      lipGeo.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
      lipGeo.setIndex(li);
      lipGeo.computeVertexNormals();
      group.add(new THREE.Mesh(lipGeo, v.flare ? plasticMat : paintMat));
      const linerGeo = new THREE.BufferGeometry();
      linerGeo.setAttribute('position', new THREE.Float32BufferAttribute(np, 3));
      linerGeo.setIndex(ni);
      linerGeo.computeVertexNormals();
      group.add(new THREE.Mesh(linerGeo, plasticMat));
    });
  });

  // ---- glass
  // Flip a patch's winding if its front face points into the vehicle
  function faceOut(geo) {
    const p = geo.attributes.position, ix = geo.index.array;
    const a = new THREE.Vector3().fromBufferAttribute(p, ix[0]);
    const b = new THREE.Vector3().fromBufferAttribute(p, ix[1]);
    const c = new THREE.Vector3().fromBufferAttribute(p, ix[2]);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    const mid = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) mid.add(new THREE.Vector3().fromBufferAttribute(p, i));
    mid.divideScalar(p.count);
    const out = mid.clone().sub(new THREE.Vector3(mid.x * 0.3, 0.6, 0));
    if (n.dot(out) < 0) {
      for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
      geo.index.needsUpdate = true;
      geo.computeVertexNormals();
    }
    return geo;
  }

  function addGlass(zone, fn, nu = 28, nv = 12, frit = 0.045) {
    const geo = patchGeometry(fn(GLASS_OFF), nu, nv);
    const tint = new THREE.Mesh(geo, tintMats[zone]);
    tint.userData.zone = zone;
    tint.renderOrder = 2;
    const refl = new THREE.Mesh(faceOut(patchGeometry(fn(GLASS_OFF + 0.001), nu, nv)), reflectMat);
    refl.renderOrder = 3;
    refl.raycast = () => {};
    zoneMeshes[zone].push(tint, refl);
    group.add(tint, refl);
    if (frit) {
      const fm = new THREE.Mesh(frameGeometry(fn(GLASS_OFF + 0.0015), frit), fritMat);
      fm.userData.zone = zone;
      if (zone !== 'visor') group.add(fm);
    }
    const loop = boundaryLoop(fn(GLASS_OFF + 0.004)).map(p => new THREE.Vector3(...p));
    outlines[zone].add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(loop), outlineMat));
  }

  v.windows.forEach(win => [-1, 1].forEach(side => addGlass(win.zone, off => sideFn(win, side, off))));
  addGlass('windshield', off => topFn(v.shield[0], v.shield[1], off), 24, 14);
  {
    const shieldLen = Math.hypot(v.shield[1] - v.shield[0], S.topY(v.shield[1], 0) - S.topY(v.shield[0], 0));
    const band = clamp(0.15 / shieldLen, 0.05, 0.4);
    addGlass('visor', off => topFn(v.shield[0], v.shield[1], off + 0.002, 1 - band, 1), 24, 3, 0);
  }
  if (v.back.type === 'top') addGlass('back', off => topFn(v.back.x[0], v.back.x[1], off), 24, 12);
  else v.back.z.forEach(zr => addGlass('back', off => capFn(xRear, -1, v.back.y[0], v.back.y[1], zr, off), 18, 10));

  // ---- trim: blacked-out pillars between windows and the beltline molding
  const sidePatch = (x0, x1, yfn0, yfn1, side, off) => (u, t) => {
    const x = lerp(x0, x1, u);
    const y = lerp(yfn0(x), yfn1(x), t);
    return [x, y, side * (S.zAt(x, y) + off)];
  };
  const sorted = [...v.windows].sort((a, b) => b.a[0] - a.a[0]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const w0 = sorted[i], w1 = sorted[i + 1];
    const x0 = Math.min(w0.b[0], w0.b[1]) + 0.02, x1 = Math.max(w1.a[0], w1.a[1]) - 0.02;
    [-1, 1].forEach(side => group.add(new THREE.Mesh(patchGeometry(sidePatch(x0, x1,
      x => S.section(x).s + 0.015, x => Math.min(S.section(x).e0 - 0.025, w0.yTop ?? 9), side, 0.0025), 4, 8), trimMat)));
  }
  if (v.floatRoof) {
    const last = sorted[sorted.length - 1];
    const x1 = Math.min(last.b[0], last.b[1]) + 0.02, x0 = xRear + 0.2;
    [-1, 1].forEach(side => group.add(new THREE.Mesh(patchGeometry(sidePatch(x0, x1,
      x => S.section(x).s + 0.015, x => S.section(x).e0 - 0.025, side, 0.0025), 10, 8), trimMat)));
  }
  {
    const xs = v.windows.flatMap(w => [...w.a, ...w.b]);
    const x0 = Math.min(...xs) - 0.02, x1 = Math.max(...xs) + 0.02;
    [-1, 1].forEach(side => group.add(new THREE.Mesh(patchGeometry(sidePatch(x0, x1,
      x => S.section(x).s - 0.004, x => S.section(x).s + 0.026, side, 0.003), 40, 2), trimMat)));
  }

  // ---- door seams (stop above the wheel arches), handles, rocker trim
  const archTop = x => {
    let y0 = -1;
    v.wheelX.forEach(wx => {
      const R = archR + 0.08;
      if (Math.abs(x - wx) < R) y0 = Math.max(y0, v.wheelR + Math.sqrt(R * R - (x - wx) ** 2));
    });
    return y0;
  };
  v.seams.forEach(([x, top]) => {
    const sc = S.section(x);
    const y0 = Math.max(sc.b + sc.rbE + 0.02, archTop(x) + 0.01);
    const y1 = (top ?? sc.s) - 0.004;
    if (y1 <= y0) return;
    [-1, 1].forEach(side => group.add(new THREE.Mesh(patchGeometry(sidePatch(x - 0.0035, x + 0.0035, () => y0, () => y1, side, 0.0015), 1, 16), trimMat)));
  });
  v.handles.forEach(x => {
    const y = S.section(x).s - 0.075;
    [-1, 1].forEach(side => {
      const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.11, 4, 8), v.van ? plasticMat : paintMat);
      h.rotation.z = Math.PI / 2;
      h.position.set(x - 0.06, y, side * (S.zAt(x, y) + 0.012));
      group.add(h);
    });
  });
  {
    const x0 = v.wheelX[0] + archR + 0.05, x1 = v.wheelX[1] - archR - 0.05;
    [-1, 1].forEach(side => group.add(new THREE.Mesh(patchGeometry(sidePatch(x0, x1,
      x => S.section(x).b + S.section(x).rbE * 0.3, x => S.section(x).b + S.section(x).rbE + (v.cladding ?? 0.05), side, 0.002), 30, 3), plasticMat)));
    if (v.runningBoard) {
      [-1, 1].forEach(side => {
        const rb = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.1, 0.035, 0.17), plasticMat);
        rb.position.set((x0 + x1) / 2, S.section((x0 + x1) / 2).b - 0.06, side * (halfW - 0.02));
        group.add(rb);
      });
    }
  }

  // ---- mirrors
  [-1, 1].forEach(side => {
    const m = v.mirror, s = m.s, x = m.x, y = S.section(x).s + 0.05;
    const zb = S.zAt(x, y);
    const hh = (m.tall ? 0.2 : 0.11) * s / (m.tall ? 1.45 : 1), hd = 0.2 * s, hw = 0.1 * s;
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.03), trimMat);
    sail.position.set(x + 0.02, y - 0.01, side * (zb + 0.01));
    group.add(sail);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.08 * s), trimMat);
    arm.position.set(x, y + 0.005, side * (zb + 0.04 * s));
    group.add(arm);
    const mirror = new THREE.Group();
    const housing = new THREE.Mesh(new RoundedBoxGeometry(hw, hh, hd, 3, Math.min(hw, hh) * 0.32), m.black ? trimMat : paintMat);
    mirror.add(housing);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(hd * 0.84, hh * 0.78), fritMat);
    face.rotation.y = -Math.PI / 2;
    face.position.x = -hw / 2 - 0.002;
    mirror.add(face);
    mirror.position.set(x - 0.01, y + hh * 0.35, side * (zb + 0.07 * s + hd / 2));
    mirror.rotation.y = side * 0.1;
    group.add(mirror);
  });

  // ---- front fascia: grille, headlights, bumper
  // Parts on the nose and tail are laid out by distance along the body surface
  // (measured from the centerline around the corner), so they keep their shape
  // where they wrap onto the sides. Negative distances are the driver side.
  const outlineCache = new Map();
  function planOutline(y, dir) {
    const key = dir + ':' + Math.round(y * 1000);
    if (outlineCache.has(key)) return outlineCache.get(key);
    const xEnd = dir > 0 ? xFront : xRear;
    const zMax = S.zAt(xEnd - dir * 0.8, y);
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const z = zMax * 0.9 * i / 30;
      pts.push([S.endX(y, z, dir), z]);
    }
    const x0 = pts[pts.length - 1][0];
    for (let i = 1; i <= 70; i++) {
      const x = x0 - dir * 0.012 * i;
      pts.push([x, S.zAt(x, y)]);
    }
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const out = { pts, len, xEnd };
    outlineCache.set(key, out);
    return out;
  }
  const wrapPoint = (dir, y, sv, off) => {
    const o = planOutline(y, dir), sa = Math.min(Math.abs(sv), o.len[o.len.length - 1]);
    let i = 0;
    while (i < o.len.length - 2 && o.len[i + 1] < sa) i++;
    const f = (sa - o.len[i]) / ((o.len[i + 1] - o.len[i]) || 1);
    const p = o.pts[i], q = o.pts[i + 1];
    const x = lerp(p[0], q[0], f), z = lerp(p[1], q[1], f);
    let nx = q[1] - p[1], nz = -(q[0] - p[0]);
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl; nz /= nl;
    if (nx * (x - (o.xEnd - dir)) + nz * z < 0) { nx = -nx; nz = -nz; }
    const sign = sv < 0 ? -1 : 1;
    return [x + nx * off, y, sign * (z + nz * off)];
  };
  const wrapFn = (dir, y0, y1, s0, s1, off) => (u, t) => wrapPoint(dir, lerp(y0, y1, t), lerp(s0, s1, u), off);
  // Four-corner shape on the nose/tail surface; corners are [distance along surface, height]
  const quadFn = (dir, bl, br, tl, tr, off) => (u, t) => {
    const sb = lerp(bl[0], br[0], u), yb = lerp(bl[1], br[1], u);
    const st = lerp(tl[0], tr[0], u), yt = lerp(tl[1], tr[1], u);
    return wrapPoint(dir, lerp(yb, yt, t), lerp(sb, st, t), off);
  };
  const mirrorQuad = (side, bl, br, tl, tr) => side > 0 ? [bl, br, tl, tr]
    : [[-br[0], br[1]], [-bl[0], bl[1]], [-tr[0], tr[1]], [-tl[0], tl[1]]];
  const frontPatch = (y0, y1, z0, z1, off) => wrapFn(1, y0, y1, z0, z1, off);
  const yFrontB = S.section(xFront).b;

  // Grille: trapezoid with honeycomb mesh and a frame (chrome bars on the pickup)
  {
    const g = v.grille, zg = g.z, top = g.trap ?? (g.chrome ? 1 : 0.86);
    const fn = off => quadFn(1, [-zg, g.y[0]], [zg, g.y[0]], [-zg * top, g.y[1]], [zg * top, g.y[1]], off);
    group.add(new THREE.Mesh(patchGeometry(fn(0.003), 16, 8), grilleMat));
    group.add(new THREE.Mesh(frameGeometry(fn(0.005), g.chrome ? 0.05 : 0.018), g.chrome ? chromeMat : trimMat));
    if (g.chrome) for (let i = 1; i < 3; i++) {
      const y = lerp(g.y[0], g.y[1], i / 3);
      group.add(new THREE.Mesh(patchGeometry(frontPatch(y - 0.012, y + 0.012, -zg * 0.95, zg * 0.95, 0.007), 12, 1), chromeMat));
    }
  }

  // Headlights: angular units sweeping up and back, projector lenses, LED strip on top
  [-1, 1].forEach(side => {
    const h = v.head, hgt = h.y[1] - h.y[0], sweep = hgt * 0.55;
    const q = mirrorQuad(side, [h.z[0] + 0.03, h.y[0]], [h.z[1], h.y[0] + sweep], [h.z[0], h.y[1]], [h.z[1] + 0.02, h.y[1] + sweep * 0.7]);
    const fn = off => quadFn(1, ...q, off);
    group.add(new THREE.Mesh(patchGeometry(fn(0.003), 16, 4), headHousingMat));
    group.add(new THREE.Mesh(patchGeometry((u, t) => fn(0.006)(lerp(0.04, 0.96, u), lerp(0.12, 0.8, t)), 16, 4), headLensMat));
    group.add(new THREE.Mesh(patchGeometry((u, t) => fn(0.009)(u, lerp(0.84, 0.97, t)), 16, 1), drlMat));
    [0.32, 0.62].forEach(u => {
      const p0 = new THREE.Vector3(...fn(0.006)(side > 0 ? u : 1 - u, 0.45));
      const p1 = new THREE.Vector3(...fn(0.03)(side > 0 ? u : 1 - u, 0.45));
      const r = Math.min(0.03, hgt * 0.28);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.7, r, 24), chromeMat);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(r * 0.7, 24), headLensMat);
      [ring, lens].forEach(m => { m.position.copy(p0); m.lookAt(p1); group.add(m); });
    });
  });
  if (v.headBar) {
    const h = v.head;
    group.add(new THREE.Mesh(patchGeometry(frontPatch(h.y[0] + 0.012, h.y[1] - 0.006, -h.z[0] - 0.01, h.z[0] + 0.01, 0.002), 16, 2), trimMat));
    group.add(new THREE.Mesh(patchGeometry(frontPatch(h.y[1] - 0.016, h.y[1] - 0.009, -h.z[0], h.z[0], 0.004), 16, 1), drlMat));
  }
  if (v.bumper) {
    group.add(new THREE.Mesh(patchGeometry(frontPatch(v.bumper.y[0], v.bumper.y[1], -(halfW + 0.01), halfW + 0.01, 0.004), 24, 2), v.bumper.chrome ? chromeMat : plasticMat));
  } else {
    // corner intakes and a black lower lip
    const g = v.grille, y0 = yFrontB + 0.06, y1 = Math.min(g.y[0] + 0.14, v.head.y[0] - 0.04);
    const si = g.z + 0.08, so = Math.min(g.z + 0.24, halfW - 0.12);
    if (so > si + 0.06 && y1 > y0 + 0.05) [-1, 1].forEach(side => {
      const q = mirrorQuad(side, [si + 0.03, y0], [so, y0 + 0.02], [si, y1], [so - 0.04, y1 + 0.03]);
      group.add(new THREE.Mesh(patchGeometry(quadFn(1, ...q, 0.003), 8, 4), grilleMat));
      group.add(new THREE.Mesh(frameGeometry(quadFn(1, ...q, 0.005), 0.012), trimMat));
    });
    group.add(new THREE.Mesh(patchGeometry(frontPatch(yFrontB + 0.004, yFrontB + 0.035, -(halfW - 0.1), halfW - 0.1, 0.004), 24, 1), trimMat));
  }
  // cowl panel and wipers at the base of the windshield
  {
    const x0 = v.shield[0];
    const hw = glassHW(x0, v.shield[0], v.shield[1]);
    const cowl = (u, t) => {
      const x = lerp(x0 + 0.06, x0 - 0.01, t), z = lerp(-hw * 0.96, hw * 0.96, u);
      return [x, S.topY(x, z) + 0.003, z];
    };
    group.add(new THREE.Mesh(patchGeometry(cowl, 12, 2), plasticMat));
    [-0.45, 0.15].forEach(zc => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const z = (zc + lerp(-0.3, 0.3, i / 10)) * hw / 0.75;
        const x = x0 - 0.03 - i * 0.004;
        pts.push(new THREE.Vector3(x, S.topY(x, z) + 0.012, z));
      }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.006, 5), plasticMat));
    });
  }

  // ---- rear: taillights, plate, bumper
  const rearPatch = (y0, y1, z0, z1, off) => wrapFn(-1, y0, y1, z0, z1, off);
  if (v.tail) [-1, 1].forEach(side => {
    const t = v.tail;
    const za = side > 0 ? t.z[0] : -t.z[1], zb = side > 0 ? t.z[1] : -t.z[0];
    if (t.bars) {
      for (let i = 0; i < t.bars; i++) {
        const u0 = i / t.bars + 0.04, u1 = (i + 1) / t.bars - 0.04;
        group.add(new THREE.Mesh(patchGeometry(rearPatch(t.y[0], t.y[1], lerp(za, zb, u0), lerp(za, zb, u1), 0.004), 6, 4), tailMat));
      }
      group.add(new THREE.Mesh(patchGeometry(rearPatch(t.y[0] - 0.01, t.y[1] + 0.01, za - 0.02, zb + 0.02, 0.002), 16, 4), trimMat));
    } else {
      group.add(new THREE.Mesh(patchGeometry(rearPatch(t.y[0], t.y[1], za, zb, 0.004), 16, 4), tailMat));
    }
  });
  if (v.tailBar && v.tail) {
    const t = v.tail;
    group.add(new THREE.Mesh(patchGeometry(rearPatch(t.y[1] - 0.03, t.y[1] - 0.01, -t.z[0] - 0.02, t.z[0] + 0.02, 0.004), 20, 1), tailMat));
  }
  if (v.plate) {
    const zp = 0.16;
    group.add(new THREE.Mesh(patchGeometry(rearPatch(v.plate[0], v.plate[1], -zp, zp, 0.004), 2, 2), plateMat));
    group.add(new THREE.Mesh(frameGeometry(rearPatch(v.plate[0], v.plate[1], -zp, zp, 0.005), 0.012), plasticMat));
  }
  if (!v.rearBumper && !v.bed) {
    const yb = S.section(xRear).b;
    group.add(new THREE.Mesh(patchGeometry(rearPatch(yb + 0.004, yb + 0.075, -(halfW - 0.14), halfW - 0.14, 0.004), 24, 2), trimMat));
  }
  if (v.rearBumper) group.add(new THREE.Mesh(patchGeometry(rearPatch(v.rearBumper[0], v.rearBumper[1], -(halfW + 0.01), halfW + 0.01, 0.004), 24, 2), plasticMat));
  if (v.rearDoorSeam) group.add(new THREE.Mesh(patchGeometry(rearPatch(v.back.y[0] - 0.95, v.back.y[1] + 0.4, -0.004, 0.004, 0.003), 1, 8), trimMat));

  // ---- SUV roof rails
  if (v.rails) {
    const [x0, x1] = v.rails;
    [-1, 1].forEach(side => {
      const z = side * (S.section((x0 + x1) / 2).hr - 0.1);
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const x = lerp(x0, x1, i / 16);
        pts.push(new THREE.Vector3(x, S.topY(x, z) + 0.035, z));
      }
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.018, 8), trimMat));
      [x0 + 0.05, x1 - 0.05].forEach(x => {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), trimMat);
        foot.position.set(x, S.topY(x, z) + 0.015, z);
        group.add(foot);
      });
    });
  }

  // ---- pickup bed: outer sides, rails, inner walls, floor, tailgate, wheel tubs
  if (v.bed) {
    const bd = v.bed, bl = bd.x[1] - bd.x[0], bx = (bd.x[0] + bd.x[1]) / 2;
    const outerH = bd.rail - bd.b;
    [-1, 1].forEach(side => {
      const wx = v.wheelX[0], R = archR;
      // outer wall with a clean arch opening
      const wall = new THREE.Shape();
      wall.moveTo(bd.x[0], bd.b);
      wall.lineTo(wx - R, bd.b);
      wall.absarc(wx, v.wheelR, R, Math.PI, 0, true);
      wall.lineTo(bd.x[1], bd.b);
      wall.lineTo(bd.x[1], bd.rail);
      wall.lineTo(bd.x[0], bd.rail);
      wall.lineTo(bd.x[0], bd.b);
      const g = new THREE.ExtrudeGeometry(wall, { depth: bd.wall, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 40 });
      g.translate(0, 0, side > 0 ? bd.w - bd.wall : -bd.w);
      group.add(new THREE.Mesh(g, paintMat));
      // flare around the rear arch
      const flare = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.03, 8, 40, Math.PI), plasticMat);
      flare.position.set(wx, v.wheelR, side * (bd.w + 0.005));
      group.add(flare);
      // rail cap
      const rail = new THREE.Mesh(new THREE.BoxGeometry(bl, 0.02, bd.wall + 0.02), plasticMat);
      rail.position.set(bx, bd.rail + 0.01, side * (bd.w - bd.wall / 2));
      group.add(rail);
      // wheel tub inside the bed
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.26, 32, 1, false, 0, Math.PI), plasticMat);
      tub.rotation.x = Math.PI / 2;
      tub.rotation.y = Math.PI / 2;
      tub.position.set(wx, v.wheelR, side * (bd.w - bd.wall - 0.13));
      group.add(tub);
    });
    const floorY = bd.floor;
    const fl = new THREE.Mesh(new THREE.BoxGeometry(bl, 0.03, bd.w * 2 - 0.02), plasticMat);
    fl.position.set(bx, floorY, 0);
    group.add(fl);
    const under = new THREE.Mesh(new THREE.BoxGeometry(bl, floorY - bd.b, bd.w * 2 - 0.3), plasticMat);
    under.position.set(bx, (floorY + bd.b) / 2, 0);
    group.add(under);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.06, outerH, bd.w * 2), paintMat);
    gate.position.set(bd.x[0] + 0.03, bd.b + outerH / 2, 0);
    gate.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(gate.geometry.attributes.position.count * 3).fill(1), 3));
    group.add(gate);
    const bulk = new THREE.Mesh(new THREE.BoxGeometry(0.05, outerH, bd.w * 2 - 0.04), paintMat);
    bulk.position.set(bd.x[1] - 0.025, bd.b + outerH / 2, 0);
    bulk.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(bulk.geometry.attributes.position.count * 3).fill(0.6), 3));
    group.add(bulk);
    // tailgate details: tail lights on the bed corners, handle, bumper
    [-1, 1].forEach(side => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.08), tailMat);
      tl.position.set(bd.x[0] - 0.005, bd.rail - 0.2, side * (bd.w - 0.045));
      group.add(tl);
    });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.22), plasticMat);
    handle.position.set(bd.x[0] - 0.005, bd.rail - 0.09, 0);
    group.add(handle);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, bd.w * 2 + 0.02), chromeMat);
    rb.position.set(bd.x[0] - 0.04, bd.b + 0.02, 0);
    group.add(rb);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.3), plateMat);
    plate.position.set(bd.x[0] - 0.125, bd.b + 0.02, 0);
    group.add(plate);
  }
  {
    // paint material uses vertex colors; give parts without them plain white ones
    group.traverse(o => {
      if (o.isMesh && o.material === paintMat && !o.geometry.attributes.color) {
        o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(o.geometry.attributes.position.count * 3).fill(1), 3));
      }
    });
  }

  // ---- wheels
  v.wheelX.forEach(x => [-1, 1].forEach(side => {
    const wh = wheel(v.wheelR, v.tireW, v.rim);
    wh.position.set(x, v.wheelR, side * (halfW - v.tireW / 2 - 0.035));
    if (side < 0) wh.scale.z = -1;
    group.add(wh);
  }));

  // ---- interior (visible through the glass)
  {
    const interior = new THREE.Group();
    const xs = v.windows.flatMap(w => [...w.a, ...w.b]);
    const cx0 = Math.min(...xs, v.back.type === 'top' ? v.back.x[1] : xs[0]) - 0.1;
    const cx1 = v.shield[0];
    const flY = S.section((cx0 + cx1) / 2).b + 0.12;
    const fw = Math.min(S.zAt((cx0 + cx1) / 2, flY + 0.2), halfW) - 0.1;
    const floorM = new THREE.Mesh(new THREE.BoxGeometry(cx1 - cx0, 0.04, fw * 2), dashMat);
    floorM.position.set((cx0 + cx1) / 2, flY, 0);
    interior.add(floorM);
    const seat = (x, z, wdt, small) => {
      // headroom is measured where the headrest sits, behind the cushion
      const roof = Math.min(S.section(x).T, S.section(x - 0.35).T) - 0.06;
      const room = clamp((roof - flY - 0.12) / 1.0, 0.6, 1.05) * (small ? 0.85 : 1);
      const g = new THREE.Group();
      const cush = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.13, wdt), seatMat);
      cush.position.set(0, 0.3 * room, 0);
      const backr = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.62 * room, wdt * 0.94), seatMat);
      backr.position.set(-0.24, 0.6 * room, 0);
      backr.rotation.z = 0.22;
      g.add(cush, backr);
      const heads = wdt > 0.8 ? [-wdt * 0.33, 0, wdt * 0.33] : [0];
      heads.forEach(hz => {
        const hr = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.17, 0.25), seatMat);
        hr.position.set(-0.32, 0.98 * room, hz);
        hr.rotation.z = 0.22;
        g.add(hr);
      });
      g.position.set(x, flY, z);
      interior.add(g);
    };
    v.seats.forEach(st => {
      if (st.type === 'pair') [-1, 1].forEach(side => seat(st.x, side * fw * 0.5, 0.5, st.small));
      else seat(st.x, 0, fw * 1.75, st.small);
    });
    const ds = S.section(v.dash);
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, (S.zAt(v.dash, ds.s) - 0.12) * 2), dashMat);
    dash.position.set(v.dash, ds.s - 0.07, 0);
    interior.add(dash);
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 32), dashMat);
    sw.position.set(v.wheel, S.section(v.wheel).s + 0.06, -fw * 0.5);
    sw.rotation.y = Math.PI / 2;
    sw.rotation.x = 0;
    sw.rotateOnAxis(new THREE.Vector3(0, 0, 1), 0.45);
    interior.add(sw);
    if (v.bulkhead) {
      const bh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, fw * 2), dashMat);
      bh.position.set(v.bulkhead, flY + 1.0, 0);
      interior.add(bh);
    }
    group.add(interior);
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
  if (zone === 'visor') return (film.visor ?? 100);
  return factoryVlt(v, zone) * ((film[zone] ?? 100) / 100);
}

// Share of light blocked, used as the dark filter's opacity
const blockAlpha = net => clamp(1 - Math.pow(net / 100, 0.8) * 0.95, 0.12, 0.975);

function cssGlass(net) {
  const c = Math.round(255 * Math.pow(0.32 * (1 - blockAlpha(net)) + 0.012, 1 / 2.2));
  return `rgb(${c},${c + 4},${c + 8})`;
}

// ---------------------------------------------------------------------------
// Floor helpers
// ---------------------------------------------------------------------------
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
  const grd = g.createRadialGradient(128, 128, 4, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.92)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0.6)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0.02).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.rotateSpeed = 0.8;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.6;

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(5, 8, 0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(-5, 3, 0);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x1a2030, 0.55));

  // Showroom floor: dark fade, turntable and soft contact shadow
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

  let current = null;
  const fit = { target: new THREE.Vector3(), radius: 3 };
  let tween = null;
  let hovered = null;
  const built = {};

  controls.addEventListener('start', () => { controls.autoRotate = false; tween = null; });

  function viewDistance() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    return fit.radius / Math.sin(Math.min(vFov, hFov) / 2) * 0.92;
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
    if (current) scene.remove(current.group);
    // Vehicles are built once and kept, so switching back is instant
    if (!built[id]) {
      built[id] = buildVehicle(v);
      ZONES.forEach(z => { built[id].outlines[z].visible = false; built[id].group.add(built[id].outlines[z]); });
    }
    current = built[id];
    scene.add(current.group);

    const bb = new THREE.Box3().setFromObject(current.group);
    const size = bb.getSize(new THREE.Vector3());
    fit.target.set(0, size.y * 0.42, 0);
    fit.radius = Math.max(size.x, size.y * 1.6) * 0.55;
    const tr = size.x * 0.62;
    turntable.scale.setScalar(tr);
    floor.scale.setScalar(tr * 5);
    ring.scale.setScalar(tr);
    ring2.scale.setScalar(tr);
    shadow.scale.set(size.x * 1.12, size.z * 1.55, 1);
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
    ['front', 'rear', 'back', 'windshield', 'visor'].forEach(z => {
      if (z === 'rear' && v.noRear) return;
      if (state.film[z] != null) parts.push(`${ZONE_LABELS[z]} ${state.film[z]}%`);
    });
    return `${v.badge}: ${parts.length ? parts.join(', ') : 'no film selected'}`;
  }

  function refresh() {
    const v = VEHICLES[state.vehicle];
    const film = state.film;

    ZONES.forEach(z => {
      tintMats[z].opacity = z === 'visor' ? (film.visor == null ? 0 : blockAlpha(netVlt(v, film, z))) : blockAlpha(netVlt(v, film, z));
      if (current) {
        current.outlines[z].visible = z === state.zone;
        if (z === 'visor') current.zoneMeshes.visor.forEach(m => { m.visible = film.visor != null || state.zone === 'visor'; });
      }
    });

    $$('[data-ts-vehicle]').forEach(b => { b.dataset.active = String(b.dataset.tsVehicle === state.vehicle); });
    const badge = $('#ts-vehicle-badge');
    if (badge) badge.textContent = v.badge;

    $$('[data-ts-zone]').forEach(btn => {
      const z = btn.dataset.tsZone;
      const disabled = z === 'rear' && v.noRear;
      btn.disabled = disabled;
      btn.dataset.active = String(z === state.zone);
      btn.querySelector('[data-ts-zone-sub]').textContent = zoneText(v, z);
      btn.querySelector('[data-ts-zone-value]').textContent = disabled ? '—' : fmt(film[z]);
      const net = z === 'visor' ? (film.visor == null ? FACTORY_CLEAR : film.visor) : netVlt(v, film, z);
      btn.querySelector('[data-ts-zone-swatch]').style.background = disabled ? 'transparent' : cssGlass(net);
    });

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

    const spec = film[state.zone];
    $('#ts-spec-vlt').textContent = spec == null ? '—' : spec + '%';
    $('#ts-spec-heat').textContent = spec == null ? '—' : Math.round(80 + (70 - spec) * 0.22) + '%';
    $('#ts-spec-glare').textContent = spec == null ? '—' : Math.round(100 - spec * 0.95) + '%';

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
    ZONES.forEach(z => tintMats[z].color.setHex(z === hovered && z !== state.zone ? 0x2a2200 : 0x040608));
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
