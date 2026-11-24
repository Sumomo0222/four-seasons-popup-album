// ============================================================
// main.js —— 立体书主程序
// 拖动 = 开合角度 · 点击照片 = 日记弹窗 · 自动播放 = 按时间翻页
// ============================================================
import * as THREE from 'three';
import { CHAPTERS, ROUTE, JOURNEY, PHOTOS } from './data.js';
import * as TX from './textures.js';
import { buildLeaf, buildCover, buildDecor, PW, PH } from './scenes.js';

const $ = s => document.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 全局状态 ----------
const S = {
  cur: 0,
  oCur: 0, oTgt: 0,                       // 当前跨页开合 0..1
  coverCur: 0, coverTgt: 0,               // 封面开合
  leafO: [0, 0, 0, 0], leafOTgt: [0, 0, 0, 0],
  leafY: [0.02, 0.02, 0.02, 0.02], leafYTgt: [0.02, 0.02, 0.02, 0.02],
  busy: false,
  auto: false, autoToken: 0,
  introDone: false,
  hover: null,
};
const LEAF_Y_OPEN = 0.046, LEAF_Y_FOLD = 0.036, COVER_Y_CLOSED = 0.058, COVER_Y_OPEN = 0.014;

// ---------- 渲染器 ----------
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9dcc4');
scene.fog = new THREE.Fog('#e9dcc4', 24, 46);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
const camTarget = new THREE.Vector3(0, 0.72, 0.1);
let elev = 0.44, elevT = 0.44, dist = 12.6, distT = 12.6, azimSway = 0;

// 灯光
scene.add(new THREE.HemisphereLight(0xfff6e6, 0xb9a184, 0.85));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.5);
sun.position.set(3.2, 8.5, 4.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
sun.shadow.camera.near = 2; sun.shadow.camera.far = 22;
sun.shadow.bias = -0.0004;
sun.shadow.radius = 3;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8f2, 0.35);
fill.position.set(-4, 5, 7);
scene.add(fill);
const warm = new THREE.PointLight(0xffdcb0, 0.5, 18);
warm.position.set(0, 4, 4.5);
scene.add(warm);

// ---------- 组书 ----------
scene.add(buildDecor());
const cover = buildCover();
cover.root.position.y = COVER_Y_CLOSED;
scene.add(cover.root);
const leaves = [0, 1, 2, 3].map(i => {
  const leaf = buildLeaf(i);
  leaf.root.position.y = LEAF_Y_FOLD;
  leaf.root.visible = false;
  scene.add(leaf.root);
  return leaf;
});

// ---------- 相机自适应 ----------
function layoutCam() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  const a = w / h;
  let d = 12.6, fov = 42;
  if (a < 0.8) { d = 18.5; fov = 52; }
  else if (a < 1.15) { d = 15.6; fov = 47; }
  else if (a < 1.5) { d = 13.8; fov = 44; }
  distT = d; dist = d;
  camera.fov = fov;
  camera.updateProjectionMatrix();
}
addEventListener('resize', layoutCam);
layoutCam();

// ---------- UI 引用 ----------
const badge = $('#badge');
const dots = [...document.querySelectorAll('#dots button')];
const slider = $('#openSlider');
const btnAuto = $('#btnAuto');
const hint = $('#hint');
let sliderHeld = false;

function updateBadge() {
  const ch = CHAPTERS[S.cur];
  badge.innerHTML = `
    <div class="badge-no">CHAPTER ${ch.no} · ${ch.seasonEn}</div>
    <div class="badge-title">${ch.season} · ${ch.title}</div>
    <div class="badge-sub">${ch.city} · ${ch.date} · ${ch.weather}</div>`;
  dots.forEach((d, i) => d.classList.toggle('on', i === S.cur));
  slider.value = Math.round(S.oTgt * 100);
}

// ---------- 自动播放 ----------
function setAuto(on) {
  S.auto = on;
  btnAuto.classList.toggle('on', on);
  btnAuto.innerHTML = on ? '⏸ 暂停自动播放' : '▶ 自动播放';
  document.body.classList.toggle('auto', on);
}
function cancelAuto() { if (S.auto) { S.autoToken++; setAuto(false); } }

async function runIntro(tk) {
  await wait(600);
  if (tk !== S.autoToken) return;
  S.coverTgt = 1;
  await wait(1500);
  if (tk !== S.autoToken) return;
  S.leafOTgt[0] = 1;
  S.leafYTgt[0] = LEAF_Y_OPEN;
  await wait(1800);
  if (tk !== S.autoToken) return;
  S.introDone = true;
  hint.classList.add('show');
  setTimeout(() => hint.classList.remove('show'), 7000);
}

// 章节间旅行路线浮层
let routeTimer = null;
function showRouteStrip(from, to, long) {
  const el = $('#routeStrip');
  const leg = ROUTE.legs[Math.min(from, to)];
  if (!leg) { el.classList.remove('show'); return; }
  const A = ROUTE.stops[leg.from], B = ROUTE.stops[leg.to];
  el.innerHTML = `
    <div class="route-card">
      <div class="route-head">旅途 · 下一站</div>
      <div class="route-line">
        <span class="city">${A.city}<i>${A.date}</i></span>
        <span class="leg"><em class="dash"></em><b>${leg.by}</b><em class="dash"></em></span>
        <span class="city">${B.city}<i>${B.date}</i></span>
      </div>
      <div class="route-note">${leg.note} · ${leg.hours}</div>
    </div>`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(routeTimer);
  routeTimer = setTimeout(() => el.classList.remove('show'), long ? 3400 : 2200);
}

// 翻页：合上 → 沿书脊翻转 → 下一章从平面逐层展开
async function goTo(k, opts = {}) {
  if (S.busy || k === S.cur || k < 0 || k > 3) return;
  S.busy = true;
  document.body.classList.add('busy');
  const from = S.cur;
  showRouteStrip(from, k, !!opts.auto);
  S.leafOTgt[from] = 0.14;
  await wait(520);
  S.leafOTgt[from] = 0;
  S.leafYTgt[from] = LEAF_Y_FOLD;
  await wait(660);
  S.leafOTgt[k] = 0.16;
  S.leafYTgt[k] = LEAF_Y_OPEN;
  await wait(440);
  S.leafOTgt[k] = 1;
  await wait(1150);
  S.cur = k;
  updateBadge();
  S.busy = false;
  document.body.classList.remove('busy');
}

async function closeBook(tk) {
  S.leafOTgt[S.cur] = 0.14;
  await wait(520);
  if (tk !== S.autoToken) return;
  S.leafOTgt[S.cur] = 0;
  await wait(760);
  if (tk !== S.autoToken) return;
  S.coverTgt = 0;
  await wait(1200);
}

async function autoRun() {
  const tk = ++S.autoToken;
  setAuto(true);
  if (!S.introDone) { await runIntro(tk); if (tk !== S.autoToken) return; }
  if (S.oTgt < 1 && S.cur === 0) { S.oTgt = 1; await wait(1400); if (tk !== S.autoToken) return; }
  for (let k = 0; k < 4; k++) {
    if (tk !== S.autoToken) return;
    if (k !== S.cur) { await goTo(k, { auto: true }); if (tk !== S.autoToken) return; }
    await wait(6200);
    if (tk !== S.autoToken) return;
  }
  // 旅程终点：合上书本，展示路线回顾
  await closeBook(tk);
  if (tk !== S.autoToken) return;
  setAuto(false);
  openFinale();
}

btnAuto.addEventListener('click', () => {
  if (S.auto) cancelAuto();
  else autoRun();
});

// ---------- 翻页按钮 / 圆点 / 滑杆 ----------
$('#btnPrev').addEventListener('click', () => { cancelAuto(); goTo(S.cur - 1); });
$('#btnNext').addEventListener('click', () => { cancelAuto(); goTo(S.cur + 1); });
dots.forEach((d, i) => d.addEventListener('click', () => { cancelAuto(); goTo(i); }));
slider.addEventListener('input', () => {
  cancelAuto();
  S.oTgt = slider.value / 100;
});
slider.addEventListener('pointerdown', () => { sliderHeld = true; });
addEventListener('pointerup', () => { sliderHeld = false; });

// ---------- 拖拽：开合角度 + 视角 ----------
let dragging = false, moved = 0, lastX = 0, lastY = 0, downT = 0;
canvas.addEventListener('pointerdown', e => {
  if (e.button !== undefined && e.button !== 0) return;
  dragging = true; moved = 0;
  lastX = e.clientX; lastY = e.clientY; downT = performance.now();
  canvas.setPointerCapture(e.pointerId);
  cancelAuto();
});
canvas.addEventListener('pointermove', e => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (!S.busy) S.oTgt = clamp(S.oTgt + dx / (innerWidth * 0.55), 0, 1);
    elevT = clamp(elevT - dy * 0.0035, 0.18, 0.66);
  } else {
    hoverCheck(e);
  }
});
canvas.addEventListener('pointerup', e => {
  dragging = false;
  if (moved < 6 && performance.now() - downT < 400 && !S.busy) pickPhoto(e);
});
canvas.addEventListener('pointercancel', () => { dragging = false; });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  distT = clamp(distT + e.deltaY * 0.012, 8.5, 20);
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------- 照片拾取 ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function castAt(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const leaf = leaves[S.cur];
  const objs = leaf.photos.flatMap(p => [p.api.mesh, p.api.hit]).filter(Boolean);
  const hits = raycaster.intersectObjects(objs, false);
  return hits.length ? hits[0].object.userData.click : null;
}
function pickPhoto(e) {
  const pid = castAt(e);
  if (pid) openPhotoModal(pid);
}
let hoverTick = 0;
function hoverCheck(e) {
  if (++hoverTick % 3 !== 0) return;
  const pid = S.busy ? null : castAt(e);
  S.hover = pid;
  canvas.style.cursor = pid ? 'pointer' : 'grab';
}

// ---------- 弹窗：照片日记 ----------
const modal = $('#modal');
function openPhotoModal(pid) {
  const p = PHOTOS[pid];
  const ch = CHAPTERS[p.chapter];
  const typeLabel = { polaroid: '拍立得', postcard: '明信片', ticket: '票根' }[p.type];
  $('#modalCard').innerHTML = `
    <button class="close" aria-label="关闭">✕</button>
    <div class="tape tl"></div><div class="tape br"></div>
    <div class="ph-frame ${p.type}"><img src="${TX.photoDataURL(pid)}" alt="${p.title}"></div>
    <div class="ph-head">
      <span class="ph-type">${typeLabel}</span>
      <h3>${p.title}</h3>
    </div>
    <div class="chips">
      <span class="chip">📅 ${p.date}</span>
      <span class="chip">📍 ${p.loc}</span>
      <span class="chip">🗓 ${ch.weather}</span>
    </div>
    <p class="diary">${p.diary}</p>
    <div class="facts">${p.facts.map(f => `<span>${f}</span>`).join('')}</div>`;
  modal.classList.add('show');
  $('#modalCard .close').addEventListener('click', closeModal);
}
function openRouteModal() {
  const rows = ROUTE.stops.map((st, i) => {
    const leg = i > 0 ? ROUTE.legs[i - 1] : null; // 抵达该站之前的那段旅程
    const legRow = leg ? `<div class="rleg"><span>${leg.by}</span><i></i><span>${leg.hours}</span></div>` : '';
    return `${i > 0 ? legRow : ''}<div class="rstop"><b>0${i + 1}</b><div><strong>${st.city}</strong><span>${st.label} · ${st.date}</span></div></div>`;
  }).join('');
  $('#modalCard').innerHTML = `
    <button class="close" aria-label="关闭">✕</button>
    <div class="tape tl"></div><div class="tape br"></div>
    <h3 class="route-title">旅行路线 · 2024—2025</h3>
    <div class="route-map">${rows}</div>
    <p class="diary">四座小城，四季各异：先乘雪国列车北上，再南下江南，坐渡轮出海，最后进山看秋天。全路线由纸张折页连成，合上书时，路也会收进平面里。</p>`;
  modal.classList.add('show');
  $('#modalCard .close').addEventListener('click', closeModal);
}
function openFinale() {
  $('#modalCard').innerHTML = `
    <button class="close" aria-label="关闭">✕</button>
    <div class="tape tl"></div><div class="tape br"></div>
    <h3 class="route-title">四季旅程 · 完</h3>
    <div class="route-map">
      ${ROUTE.stops.map((st, i) => `<div class="rstop"><b>0${i + 1}</b><div><strong>${st.city}</strong><span>${st.label} · ${st.date}</span></div></div>`).join('<div class="rleg done">✓</div>')}
    </div>
    <p class="diary">雪国列车、杏花石桥、青屿白帆、栎霜篝火——都已被折进这册书页。感谢翻阅，四季再来。</p>
    <div class="fin-btns">
      <button id="finReplay">↺ 再看一遍</button>
      <button id="finOpen">翻开这本书</button>
    </div>`;
  modal.classList.add('show');
  $('#modalCard .close').addEventListener('click', closeModal);
  $('#finReplay').addEventListener('click', () => { closeModal(); autoRun(); });
  $('#finOpen').addEventListener('click', () => {
    closeModal();
    S.coverTgt = 1;
    setTimeout(() => { S.leafOTgt[3] = 1; S.leafYTgt[3] = LEAF_Y_OPEN; S.cur = 3; updateBadge(); }, 1300);
  });
}
function closeModal() { modal.classList.remove('show'); }
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
$('#btnRoute').addEventListener('click', openRouteModal);
$('#btnHelp').addEventListener('click', () => {
  $('#modalCard').innerHTML = `
    <button class="close" aria-label="关闭">✕</button>
    <div class="tape tl"></div><div class="tape br"></div>
    <h3 class="route-title">怎样翻开这本立体书</h3>
    <ul class="help">
      <li>🖱 左右拖动书页（或拖动底部滑杆）：控制书本开合角度，看场景从平面逐层展开。</li>
      <li>🖱 上下拖动：调整视角；滚轮 / 双指缩放：拉近拉远。</li>
      <li>📷 点击书页上立起的照片、明信片、票根：查看日期、地点与碎片日记。</li>
      <li>▶ 自动播放：按时间顺序翻页，章节之间会展示旅行路线。</li>
      <li>⌨ 方向键翻章，空格键开始 / 暂停自动播放。</li>
    </ul>`;
  modal.classList.add('show');
  $('#modalCard .close').addEventListener('click', closeModal);
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (modal.classList.contains('show')) return;
  if (e.key === 'ArrowRight') { cancelAuto(); goTo(S.cur + 1); }
  if (e.key === 'ArrowLeft') { cancelAuto(); goTo(S.cur - 1); }
  if (e.key === ' ') { e.preventDefault(); S.auto ? cancelAuto() : autoRun(); }
});

// ---------- 主循环 ----------
const clock = new THREE.Clock();
function tick(dt, time) {
  const damp = THREE.MathUtils.damp;
  S.oCur = damp(S.oCur, S.oTgt, 5.5, dt);
  S.coverCur = damp(S.coverCur, S.coverTgt, 4.2, dt);
  for (let i = 0; i < 4; i++) {
    S.leafO[i] = damp(S.leafO[i], S.leafOTgt[i], 4.2, dt);
    S.leafY[i] = damp(S.leafY[i], S.leafYTgt[i], 4.5, dt);
  }

  // 封面：合拢时在最上方，翻开后沉到桌面（被左页压住）
  cover.root.visible = true;
  cover.L.rotation.z = -Math.PI * (1 - S.coverCur);
  cover.root.position.y = S.coverCur < 0.45 ? COVER_Y_CLOSED : COVER_Y_OPEN;

  // 跨页
  leaves.forEach((leaf, i) => {
    const o = S.leafO[i];
    leaf.root.visible = o > 0.004;
    if (!leaf.root.visible) return;
    leaf.L.rotation.z = -Math.PI * (1 - o);
    leaf.root.position.y = S.leafY[i];
    leaf.set(o, time);
  });

  // 照片悬停放大
  const leaf = leaves[S.cur];
  for (const p of leaf.photos) {
    const t = S.hover === p.pid ? 1.07 : 1;
    const s = damp(p.api.pivot.scale.x, t, 10, dt);
    p.api.pivot.scale.setScalar(s);
  }

  // 自动播放时的轻柔摇镜
  const sway = S.auto ? Math.sin(time * 0.35) * 0.05 : Math.sin(time * 0.22) * 0.012;
  azimSway = sway;
  elev = damp(elev, elevT, 5, dt);
  dist = damp(dist, distT, 4, dt);
  camera.position.set(
    camTarget.x + dist * Math.cos(elev) * Math.sin(azimSway),
    camTarget.y + dist * Math.sin(elev),
    camTarget.z + dist * Math.cos(elev) * Math.cos(azimSway)
  );
  camera.lookAt(camTarget);

  if (!sliderHeld && !dragging) slider.value = Math.round(S.oCur * 100);

  renderer.render(scene, camera);
}
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  tick(dt, clock.elapsedTime);
}

// ---------- 启动 ----------
(async function init() {
  // 等待手写字体就绪（超时则用楷体回退），再生成全部纸艺贴图
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('80px "Ma Shan Zheng"'),
        document.fonts.load('600 40px "Noto Serif SC"'),
      ]),
      wait(2600),
    ]);
  } catch (e) { /* 字体失败时回退本地楷体 */ }

  updateBadge();
  frame();
  $('#loader').classList.add('done');
  // 开场：封面自动翻开，第一章从平面展开
  runIntro(++S.autoToken);

  // 调试 / 无头验证钩子（不影响正常使用）
  window.__album = {
    S, openPhotoModal, openRouteModal, closeModal, cover, leaves,
    jump(ch, o = 1, coverO = 1) {
      S.autoToken++; S.auto = false;
      S.cur = ch;
      S.oTgt = o; S.oCur = o;
      S.coverTgt = coverO; S.coverCur = coverO;
      for (let i = 0; i < 4; i++) {
        S.leafO[i] = i === ch ? o : 0;
        S.leafOTgt[i] = S.leafO[i];
        S.leafY[i] = i === ch && o > 0.3 ? LEAF_Y_OPEN : LEAF_Y_FOLD;
        S.leafYTgt[i] = S.leafY[i];
      }
      updateBadge();
    },
    step(n = 1, dt = 1 / 60) {
      let t = performance.now() / 1000;
      for (let i = 0; i < n; i++) { t += dt; tick(dt, t); }
    },
    shot() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },
  };
})();
