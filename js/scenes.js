// ============================================================
// scenes.js —— 立体书结构
// 所有场景均由“纸张折叠”构成：每个部件都是一个绕折线旋转的纸片，
// 书页合拢（o→0）时全部回到 0°，自然压回平面。
//   hinge: 'stand' 底边折起（面向读者立起）
//          'lean'  远端悬挂前倾（雨棚 / 樱花枝 / 雾带）
//          'side'  侧边折起（V 形折右腿，折线平行于书沟）
//          'sidep' 同上镜像（V 形折左腿，装在左页）
// ============================================================
import * as THREE from 'three';
import { CHAPTERS, PHOTOS } from './data.js';
import * as TX from './textures.js';

export const PW = 4.6, PH = 6.4;      // 半页宽 / 页深（跨页全宽 = 2·PW）
export const CW = PW + 0.14, CH = PH + 0.18; // 封面略大于内页
const DEG = Math.PI / 180;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

const PHOTO_SIZE = { polaroid: [1.14, 1.27], postcard: [1.5, 1.05], ticket: [1.52, 0.66] };

// ---------- 纸片部件 ----------
export function makePiece(opt) {
  const {
    parent, x = 0, z = 0, y = 0.012, w = 1, h = 1, tex,
    hinge = 'stand', max = 90 * DEG, start = 0.12, end = 0.85,
    wobble = 0, flame = false, opacity = 1, yaw = 0,
    click = null, castShadow = false, blob = 0,
  } = opt;
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  parent.add(pivot);

  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, alphaTest: 0.06,
    side: THREE.DoubleSide, roughness: 0.95, metalness: 0, opacity,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (castShadow) {
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45,
    });
  }
  if (hinge === 'stand') { mesh.rotation.x = -Math.PI / 2; mesh.position.z = -h / 2; }
  else if (hinge === 'lean') { mesh.rotation.x = -Math.PI / 2; mesh.position.z = h / 2; }
  else if (hinge === 'side') { mesh.rotation.x = -Math.PI / 2; mesh.position.x = -w / 2; }
  else { mesh.rotation.x = -Math.PI / 2; mesh.position.x = w / 2; }
  pivot.add(mesh);

  // 点击热区（放大，便于手机点按）
  let hit = null;
  if (click) {
    hit = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.3, h * 1.32),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    mesh.add(hit);
    mesh.userData.click = click;
    hit.userData.click = click;
  }

  // 接触阴影（纸片立起时在页面上投下的柔影）
  let blobMesh = null;
  if (blob > 0 && hinge === 'stand') {
    blobMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(blob, blob * 0.4),
      new THREE.MeshBasicMaterial({ map: TX.blobTexture(), transparent: true, opacity: 0, depthWrite: false })
    );
    blobMesh.rotation.x = -Math.PI / 2;
    blobMesh.position.set(x, 0.0055, z + h * 0.1);
    blobMesh.renderOrder = -1;
    parent.add(blobMesh);
  }

  const api = { pivot, mesh, hit, click };
  api.set = (o, time) => {
    const f = smooth((o - start) / (end - start));
    const a = max * f;
    pivot.rotation.y = yaw * f; // 向书沟微倾，模拟 V 形折的聚拢感
    if (hinge === 'side') pivot.rotation.z = -a;
    else if (hinge === 'sidep') pivot.rotation.z = a;
    else pivot.rotation.x = (hinge === 'stand' ? 1 : -1) * a;
    if (wobble) pivot.rotation.z = Math.sin(time * 1.6 + x * 2.3) * wobble * f;
    if (flame) { mesh.scale.y = 1 + Math.sin(time * 13 + x) * 0.07 * f; mesh.scale.x = 1 + Math.sin(time * 17) * 0.04 * f; }
    if (blobMesh) { blobMesh.material.opacity = 0.32 * f; blobMesh.visible = f > 0.02; }
  };
  return api;
}

// ---------- 与书页相连的照片 ----------
function makePhoto(ctx, pid, x, z, ang = 101, start = 0.55, onLeft = false) {
  const def = PHOTOS[pid];
  const [w, h] = PHOTO_SIZE[def.type];
  const piece = makePiece({
    parent: onLeft ? ctx.L : ctx.R, x, z, w, h,
    tex: TX.photoTexture(pid), hinge: 'stand',
    max: ang * DEG, start, end: 1.0,
    click: pid, castShadow: true, blob: w * 1.1,
  });
  ctx.pieces.push(piece);
  ctx.photos.push({ pid, api: piece });
  return piece;
}

// ---------- 蒸汽（冬 · 火车头） ----------
function makeSteam(ctx, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.03, z);
  ctx.R.add(g);
  const puffs = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshBasicMaterial({ map: TX.puffTexture(), transparent: true, depthWrite: false })
    );
    g.add(m); puffs.push(m);
  }
  ctx.pieces.push({
    set(o, time) {
      const f = smooth((o - 0.5) / 0.5);
      g.visible = f > 0.03;
      if (!g.visible) return;
      puffs.forEach((p, i) => {
        const t = (time * 0.42 + i / 3) % 1;
        p.position.y = 0.18 + t * 1.05;
        p.position.x = Math.sin(t * 4.5 + i * 2.1) * 0.14;
        p.scale.setScalar(0.4 + t * 0.8);
        p.material.opacity = (1 - t) * 0.65 * f;
      });
    },
  });
}

// ---------- 漂浮纸屑（雪 / 樱瓣 / 落叶） ----------
function makeParticles(ctx, kind, count, x0, x1, z0, z1, size) {
  const g = new THREE.Group();
  ctx.R.add(g); // 挂在 R 上，随 leaf 显隐（坐标覆盖整个跨页）
  const tex = TX.dotTexture(kind);
  const geo = new THREE.PlaneGeometry(size, size);
  const items = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -0.3;
    items.push({
      m,
      x: x0 + Math.random() * (x1 - x0),
      z: z0 + Math.random() * (z1 - z0),
      ph: Math.random() * 9,
      v: 0.22 + Math.random() * 0.35,
      spin: (Math.random() - 0.5) * 2.2,
    });
    g.add(m);
  }
  ctx.pieces.push({
    set(o, time) {
      const f = smooth((o - 0.4) / 0.4);
      g.visible = f > 0.05;
      if (!g.visible) return;
      for (const it of items) {
        const y = 2.9 - ((time * it.v + it.ph * 0.7) % 3);
        it.m.position.set(it.x + Math.sin(time * 0.6 + it.ph) * 0.3, y, it.z);
        it.m.rotation.z = it.ph + time * it.spin;
        it.m.material.opacity = f * 0.95;
      }
    },
  });
}

// ---------- 篝火光（秋） ----------
function makeFireGlow(ctx, x, z) {
  const light = new THREE.PointLight(0xffa04a, 0, 3.4, 2);
  light.position.set(x, 0.55, z);
  ctx.R.add(light);
  ctx.pieces.push({
    set(o, time) {
      const f = smooth((o - 0.45) / 0.35);
      light.intensity = f * (0.6 + Math.sin(time * 11) * 0.2 + Math.sin(time * 23.7) * 0.12);
    },
  });
}

// ============================================================
//  四个章节的纸艺场景
// ============================================================
const BUILDERS = [
  // —— 01 冬 · 雪国列车 ——
  ({ R, L, add, photo, pieces }) => {
    // 雪山主景片（面向读者，微向书沟聚拢，合拢时倒伏回纸面）
    add(makePiece({ parent: R, x: 1.2, z: -1.75, y: 0.014, w: 2.6, h: 2.0, tex: TX.art('winter-mtn', 'up'), hinge: 'stand', max: 78 * DEG, start: 0.05, end: 0.8, yaw: -0.3 }));
    add(makePiece({ parent: L, x: -1.2, z: -1.75, y: 0.014, w: 2.6, h: 2.0, tex: TX.art('winter-mtn', 'up'), hinge: 'stand', max: 78 * DEG, start: 0.05, end: 0.8, yaw: 0.3 }));
    // 远景雪山 + 松林（多层景片）
    add(makePiece({ parent: R, x: 2.3, z: -2.55, y: 0.01, w: 4.6, h: 1.9, tex: TX.art('winter-range'), hinge: 'stand', max: 82 * DEG, start: 0.02, end: 0.72 }));
    add(makePiece({ parent: R, x: 2.1, z: -2.1, y: 0.012, w: 3.2, h: 1.05, tex: TX.art('winter-pines'), hinge: 'stand', max: 80 * DEG, start: 0.1, end: 0.78 }));
    add(makePiece({ parent: L, x: -2.2, z: -2.45, y: 0.011, w: 3.0, h: 0.98, tex: TX.art('winter-pines'), hinge: 'stand', max: 78 * DEG, start: 0.05, end: 0.72 }));
    // 列车（底边折起立起）
    add(makePiece({ parent: R, x: 2.2, z: -1.3, y: 0.015, w: 3.2, h: 1.02, tex: TX.art('winter-train'), hinge: 'stand', max: 88 * DEG, start: 0.15, end: 0.85, blob: 3.3 }));
    makeSteam({ R, pieces }, 1.0, -1.4);
    // 照片
    photo('winter-platform', 1.15, 2.05, 102);
    photo('winter-ticket', 3.1, 1.55, 99, 0.62);
    photo('winter-window', -3.1, 1.3, 100, 0.6, true);
    photo('winter-inn', -1.55, 2.15, 98, 0.66, true);
    makeParticles({ R, pieces }, 'snow', 56, -4.4, 4.4, -2.8, 3.0, 0.09);
  },

  // —— 02 春 · 江南古镇 ——
  ({ R, L, add, photo, pieces }) => {
    // 远山薄雾
    add(makePiece({ parent: R, x: 2.3, z: -2.6, y: 0.01, w: 4.4, h: 1.5, tex: TX.art('spring-mist'), hinge: 'stand', max: 80 * DEG, start: 0.02, end: 0.7 }));
    // 白墙民居景片（左右各一，微向书沟聚拢）
    add(makePiece({ parent: R, x: 1.15, z: -1.4, y: 0.014, w: 2.5, h: 1.55, tex: TX.art('spring-houses', 'up'), hinge: 'stand', max: 76 * DEG, start: 0.06, end: 0.8, yaw: -0.28 }));
    add(makePiece({ parent: L, x: -1.15, z: -1.4, y: 0.014, w: 2.5, h: 1.55, tex: TX.art('spring-houses', 'up'), hinge: 'stand', max: 76 * DEG, start: 0.06, end: 0.8, yaw: 0.28 }));
    // 石桥（中景立片，架在河道上）
    add(makePiece({ parent: R, x: 1.6, z: -0.95, y: 0.012, w: 2.4, h: 1.05, tex: TX.art('spring-bridge'), hinge: 'stand', max: 86 * DEG, start: 0.1, end: 0.8, blob: 2.5 }));
    // 摇橹船（在河道上，随开页立起 + 轻摇）
    add(makePiece({ parent: R, x: 0.95, z: -0.35, y: 0.015, w: 0.95, h: 0.8, tex: TX.art('spring-boat'), hinge: 'stand', max: 90 * DEG, start: 0.2, end: 0.88, wobble: 0.05, blob: 1.1 }));
    // 灯笼
    add(makePiece({ parent: R, x: 4.0, z: -0.55, y: 0.013, w: 0.42, h: 0.66, tex: TX.art('spring-lantern'), hinge: 'stand', max: 92 * DEG, start: 0.3, end: 0.92 }));
    // 樱花枝（页角立起）
    add(makePiece({ parent: R, x: 3.3, z: -2.2, y: 0.013, w: 2.1, h: 0.95, tex: TX.art('spring-sakura'), hinge: 'stand', max: 72 * DEG, start: 0.15, end: 0.85 }));
    add(makePiece({ parent: L, x: -1.6, z: -2.4, y: 0.013, w: 2.1, h: 0.95, tex: TX.art('spring-sakura'), hinge: 'stand', max: 68 * DEG, start: 0.12, end: 0.8 }));
    photo('spring-bridge', 2.6, 2.1, 100);
    photo('spring-ticket', 3.75, 1.45, 99, 0.62);
    photo('spring-boat', -1.65, 1.9, 101, 0.58, true);
    photo('spring-lane', -3.4, 1.3, 100, 0.6, true);
    makeParticles({ R, pieces }, 'petal', 44, -4.2, 4.4, -2.6, 2.8, 0.085);
  },

  // —— 03 夏 · 海岛 ——
  ({ R, L, add, photo, pieces }) => {
    // 天空 / 太阳 / 远岛
    add(makePiece({ parent: R, x: 2.3, z: -2.62, y: 0.01, w: 4.6, h: 2.1, tex: TX.art('summer-sky'), hinge: 'stand', max: 80 * DEG, start: 0.02, end: 0.7 }));
    // 灯塔（礁石上）
    add(makePiece({ parent: R, x: 3.45, z: -2.2, y: 0.013, w: 1.0, h: 1.95, tex: TX.art('summer-lighthouse'), hinge: 'stand', max: 85 * DEG, start: 0.12, end: 0.82, blob: 1.2 }));
    // 三层海浪：随开页依次升起
    add(makePiece({ parent: R, x: 2.3, z: -1.78, y: 0.011, w: 4.4, h: 0.7, tex: TX.art('summer-wave1'), hinge: 'stand', max: 50 * DEG, start: 0.1, end: 0.8 }));
    add(makePiece({ parent: R, x: 2.3, z: -1.12, y: 0.013, w: 4.5, h: 0.78, tex: TX.art('summer-wave2'), hinge: 'stand', max: 64 * DEG, start: 0.22, end: 0.88 }));
    add(makePiece({ parent: R, x: 2.3, z: -0.52, y: 0.015, w: 4.6, h: 0.85, tex: TX.art('summer-wave3'), hinge: 'stand', max: 76 * DEG, start: 0.34, end: 0.95, blob: 4.4 }));
    // 帆船（随浪立起 + 摇晃）
    add(makePiece({ parent: R, x: 1.3, z: -1.0, y: 0.018, w: 1.15, h: 1.3, tex: TX.art('summer-boat'), hinge: 'stand', max: 86 * DEG, start: 0.26, end: 0.9, wobble: 0.06, blob: 1.3 }));
    // 左页浪花呼应
    add(makePiece({ parent: L, x: -2.3, z: -2.3, y: 0.012, w: 4.4, h: 0.7, tex: TX.art('summer-wave1'), hinge: 'stand', max: 58 * DEG, start: 0.08, end: 0.75 }));
    photo('summer-lighthouse', -3.2, 1.35, 100, 0.6, true);
    photo('summer-sail', -1.45, 2.15, 98, 0.66, true);
    photo('summer-ticket', 3.6, 1.5, 99, 0.62);
    photo('summer-wave', 1.2, 2.05, 102);
  },

  // —— 04 秋 · 山野 ——
  ({ R, L, add, photo, pieces }) => {
    // 暮色山峰景片（面向读者，微向书沟聚拢）
    add(makePiece({ parent: R, x: 1.2, z: -1.55, y: 0.014, w: 2.6, h: 1.95, tex: TX.art('autumn-peaks', 'up'), hinge: 'stand', max: 78 * DEG, start: 0.06, end: 0.8, yaw: -0.3 }));
    add(makePiece({ parent: L, x: -1.2, z: -1.55, y: 0.014, w: 2.6, h: 1.95, tex: TX.art('autumn-peaks', 'up'), hinge: 'stand', max: 78 * DEG, start: 0.06, end: 0.8, yaw: 0.3 }));
    // 雾带（前倾）
    add(makePiece({ parent: R, x: 2.2, z: -2.35, y: 0.012, w: 4.2, h: 0.8, tex: TX.art('autumn-mist'), hinge: 'lean', max: 35 * DEG, start: 0.2, end: 0.9 }));
    // 林片（左右各一）
    add(makePiece({ parent: R, x: 1.15, z: -1.95, y: 0.012, w: 1.7, h: 1.4, tex: TX.art('autumn-treesL'), hinge: 'stand', max: 80 * DEG, start: 0.1, end: 0.8 }));
    add(makePiece({ parent: R, x: 3.7, z: -2.05, y: 0.012, w: 1.5, h: 1.3, tex: TX.art('autumn-treesR'), hinge: 'stand', max: 78 * DEG, start: 0.12, end: 0.8 }));
    add(makePiece({ parent: L, x: -2.5, z: -2.15, y: 0.012, w: 1.5, h: 1.3, tex: TX.art('autumn-treesR'), hinge: 'stand', max: 78 * DEG, start: 0.08, end: 0.75 }));
    // 帐篷（底边折起）与篝火（带火光）
    add(makePiece({ parent: R, x: 1.0, z: -0.5, y: 0.015, w: 0.95, h: 0.85, tex: TX.art('autumn-tent'), hinge: 'stand', max: 92 * DEG, start: 0.3, end: 0.9, blob: 1.2 }));
    add(makePiece({ parent: R, x: 1.95, z: -0.35, y: 0.015, w: 0.6, h: 0.62, tex: TX.art('autumn-fire'), hinge: 'stand', max: 94 * DEG, start: 0.35, end: 0.95, flame: true, blob: 0.8 }));
    makeFireGlow({ R, pieces }, 1.95, -0.3);
    photo('autumn-camp', -1.7, 1.9, 101, 0.58, true);
    photo('autumn-dawn', -3.4, 1.3, 100, 0.6, true);
    photo('autumn-ticket', 3.6, 1.55, 99, 0.62);
    photo('autumn-fire', 2.9, 2.1, 102);
    makeParticles({ R, pieces }, 'leaf', 40, -4.2, 4.4, -2.6, 2.8, 0.1);
  },
];

// ---------- 章节跨页（左右页 + 全部纸艺件） ----------
export function buildLeaf(chIdx) {
  const root = new THREE.Group();
  const R = new THREE.Group();
  const L = new THREE.Group();
  root.add(R, L);

  const geo = new THREE.PlaneGeometry(PW, PH);
  const mR = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: TX.pageTexture(chIdx, 'right'), roughness: 0.96, metalness: 0 }));
  mR.rotation.x = -Math.PI / 2;
  mR.position.set(PW / 2, 0, 0);
  mR.castShadow = true; mR.receiveShadow = true;
  R.add(mR);

  const mL = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: TX.pageTexture(chIdx, 'left'), roughness: 0.96, metalness: 0 }));
  mL.rotation.x = -Math.PI / 2;
  mL.scale.x = -1;
  mL.position.set(-PW / 2, 0, 0);
  mL.castShadow = true; mL.receiveShadow = true;
  L.add(mL);

  const ctx = { R, L, root, pieces: [], photos: [] };
  const add = p => { ctx.pieces.push(p); return p; };
  ctx.add = add;
  ctx.photo = (...args) => makePhoto(ctx, ...args);
  BUILDERS[chIdx](ctx);

  return {
    root, R, L, photos: ctx.photos, chIdx,
    set: (o, time) => { for (const p of ctx.pieces) p.set(o, time); },
  };
}

// ---------- 封面（含外封 / 环衬路线图） ----------
export function buildCover() {
  const root = new THREE.Group();
  const L = new THREE.Group();
  root.add(L);

  const geoIn = new THREE.PlaneGeometry(CW, CH);
  const geoOut = new THREE.PlaneGeometry(CW, CH);
  geoOut.scale(1, -1, 1); // 外封：合上时朝上，画面方向正确

  const pIn = new THREE.Mesh(geoIn, new THREE.MeshStandardMaterial({ map: TX.coverInsideTexture(), roughness: 0.96, side: THREE.DoubleSide }));
  pIn.rotation.x = -Math.PI / 2;
  pIn.scale.x = -1;
  pIn.position.set(-CW / 2, 0.005, 0);
  pIn.castShadow = true; pIn.receiveShadow = true;

  const pOut = new THREE.Mesh(geoOut, new THREE.MeshStandardMaterial({ map: TX.coverTexture(), roughness: 0.94, side: THREE.DoubleSide }));
  pOut.rotation.x = Math.PI / 2;
  pOut.scale.x = -1;
  pOut.position.set(-CW / 2, -0.005, 0);
  pOut.castShadow = true;

  L.add(pIn, pOut);
  return { root, L };
}

// ---------- 书台 / 后封纸板 / 书芯（右侧纸叠） ----------
export function buildDecor() {
  const g = new THREE.Group();

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 34),
    new THREE.MeshStandardMaterial({ map: TX.tableTexture(), roughness: 1 })
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = 0;
  table.receiveShadow = true;
  g.add(table);

  // 后封纸板（右页下方，永远可见）
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(PW + 0.4, 0.02, PH + 0.26),
    new THREE.MeshStandardMaterial({ map: TX.backCoverTexture(), roughness: 0.95 })
  );
  board.position.set((PW + 0.4) / 2 - 0.08, 0.011, 0);
  board.castShadow = true; board.receiveShadow = true;
  g.add(board);

  // 书芯纸叠（书页侧面层理）
  const stack = new THREE.Mesh(
    new THREE.BoxGeometry(PW - 0.04, 0.012, PH - 0.08),
    new THREE.MeshStandardMaterial({ map: TX.stackTexture(), roughness: 0.98 })
  );
  stack.position.set(PW / 2, 0.027, 0);
  stack.castShadow = true; stack.receiveShadow = true;
  g.add(stack);

  return g;
}
