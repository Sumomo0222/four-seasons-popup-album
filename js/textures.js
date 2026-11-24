// ============================================================
// textures.js —— 纸艺贴图生成器
// 所有照片 / 明信片 / 票根 / 邮票 / 页面 / 封面 均为程序绘制的
// 原创示例内容（无外部图片素材）。
// 画布约定：canvas 顶部 = 书页远端（装订线对侧），底部 = 近端。
// ============================================================
import * as THREE from 'three';
import { CHAPTERS, PHOTOS } from './data.js';

// ---------- 基础工具 ----------
function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function grain(ctx, w, h, n = 2400, a = 0.05) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const d = Math.random() > 0.5;
    ctx.fillStyle = `rgba(${d ? '92,74,52' : '255,255,250'},${(a * Math.random()).toFixed(3)})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.restore();
}
function shOn(ctx, blur = 9, dy = 4, color = 'rgba(72,54,36,0.30)') {
  ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetY = dy;
}
function shOff(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
function vgrad(ctx, x, y, w, h, c1, c2) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function font(px, weight = 400, family = 'serif') {
  return `${weight} ${px}px ${family}`;
}
const HAND = '"Ma Shan Zheng","Kaiti SC","STKaiti",serif';
const SANS = '"Noto Serif SC","Songti SC",Georgia,serif';

function toTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- 旋转 / 翻转包装器 ----------
// orient: 'up' 自然 | 'sideL' 逆时针90°(V折左腿: 画面顶→画布左) | 'sideR' 顺时针90° | 'lean' 垂直翻转
function oriented(w, h, orient, drawFn) {
  if (orient === 'up') {
    const [c, ctx] = cv(w, h); drawFn(ctx, w, h); return c;
  }
  if (orient === 'lean') {
    const [c, ctx] = cv(w, h);
    ctx.translate(0, h); ctx.scale(1, -1);
    drawFn(ctx, w, h); return c;
  }
  const [t, tc] = cv(w, h); drawFn(tc, w, h);
  const [c, ctx] = cv(h, w);
  if (orient === 'sideL') { ctx.translate(0, c.height); ctx.rotate(-Math.PI / 2); }
  else { ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); }
  ctx.drawImage(t, 0, 0);
  return c;
}

// ============================================================
//  基元图形库（照片插画与场景贴图共用，保证风格统一）
// ============================================================
const PAL = {
  W: { sky1: '#cfdff0', sky2: '#f2f7fb', ice: '#aecbe3', deep: '#7fa3c4', snow: '#ffffff', ink: '#3d4753', warm: '#f4b94e', body: '#5e6f80', band: '#f2ead8', red: '#c05a4e', pine: '#4d6a63' },
  S: { mist: '#cfe0d3', celadon: '#a9c6b4', wall: '#f9f5ea', roof: '#46555e', water: '#9fc6cb', waterD: '#7dadb4', sakura: '#f3aec6', sakuraD: '#e58bab', bridge: '#9aa4a6', bridgeD: '#7c8689', wood: '#8a6a4d' },
  U: { sky1: '#c9edf1', sky2: '#f6fbcc', sea: '#57b6c8', seaD: '#2f8aa2', foam: '#ffffff', sand: '#f2e2ba', lhRed: '#d95f4b', white: '#fbf8f0', boat: '#9a704a', sun: '#f9d96c' },
  A: { sky1: '#f3dcc0', sky2: '#e3b68f', peak1: '#b5622f', peak2: '#d98d54', peak3: '#8a4a2c', tree1: '#d07c35', tree2: '#a8442e', tree3: '#e0a34a', tent: '#e8b23c', fire1: '#e8752e', fire2: '#f6c14b', night: '#5b4a6b', trunk: '#6d5138' },
};

// 山脉（锯齿三角）
function pRange(ctx, x, y, w, h, cMain, cShadow, snowline, seed = 1) {
  const peaks = seed === 1 ? [[0.06, 0.55], [0.26, 0.92], [0.5, 0.68], [0.72, 0.98], [0.93, 0.6]] : [[0.1, 0.8], [0.32, 0.5], [0.55, 0.95], [0.8, 0.62]];
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  for (const [fx, fh] of peaks) {
    ctx.lineTo(x + w * Math.max(0, fx - 0.08), y + h * (1 - fh * 0.35));
    ctx.lineTo(x + w * fx, y + h * (1 - fh));
  }
  ctx.lineTo(x + w, y + h); ctx.closePath();
  ctx.fillStyle = cMain; ctx.fill();
  // 阴影侧
  ctx.save(); ctx.clip();
  ctx.fillStyle = cShadow;
  for (const [fx, fh] of peaks) {
    ctx.beginPath();
    ctx.moveTo(x + w * fx, y + h * (1 - fh));
    ctx.lineTo(x + w * Math.min(1, fx + 0.16), y + h * (1 - fh * 0.3));
    ctx.lineTo(x + w * Math.max(0, fx - 0.02), y + h);
    ctx.lineTo(x + w * fx, y + h);
    ctx.closePath(); ctx.fill();
  }
  if (snowline) { // 雪顶
    ctx.fillStyle = '#ffffff';
    for (const [fx, fh] of peaks) {
      const px = x + w * fx, py = y + h * (1 - fh);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + w * 0.05, py + h * 0.13);
      ctx.lineTo(px + w * 0.02, py + h * 0.10);
      ctx.lineTo(px - w * 0.01, py + h * 0.15);
      ctx.lineTo(px - w * 0.05, py + h * 0.13);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
function pPine(ctx, x, y, s, c = '#4d6a63', snow = 0) {
  ctx.fillStyle = '#6d5138';
  ctx.fillRect(x - s * 0.06, y - s * 0.12, s * 0.12, s * 0.14);
  for (let i = 0; i < 3; i++) {
    const wy = y - s * 0.1 - i * s * 0.28, ww = s * (0.42 - i * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, wy - s * 0.42); ctx.lineTo(x + ww, wy); ctx.lineTo(x - ww, wy);
    ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    if (snow > 0) {
      ctx.fillStyle = `rgba(255,255,255,${snow})`;
      ctx.beginPath();
      ctx.moveTo(x, wy - s * 0.42); ctx.lineTo(x + ww * 0.6, wy - s * 0.1); ctx.lineTo(x - ww * 0.5, wy - s * 0.08);
      ctx.closePath(); ctx.fill();
    }
  }
}
function pHouse(ctx, x, y, w, h, wall = '#f9f5ea', roof = '#46555e', lit = null) {
  ctx.fillStyle = wall; ctx.fillRect(x, y - h, w, h);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, y - h);
  ctx.lineTo(x + w * 0.5, y - h - w * 0.42);
  ctx.lineTo(x + w * 1.12, y - h);
  ctx.closePath(); ctx.fillStyle = roof; ctx.fill();
  ctx.fillStyle = '#8b9aa3';
  ctx.fillRect(x + w * 0.18, y - h * 0.62, w * 0.22, h * 0.34);
  if (lit) { ctx.fillStyle = lit; ctx.fillRect(x + w * 0.6, y - h * 0.6, w * 0.2, h * 0.3); }
}
function pWave(ctx, x, y, w, h, c1, c2) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  // 起伏上缘
  const seg = 6;
  for (let i = 0; i <= seg; i++) {
    const px = x + (w * i) / seg, py = y + Math.sin(i * 2.1) * h * 0.18;
    i === 0 ? ctx.lineTo(px, py) : ctx.quadraticCurveTo(px - w / seg / 2, py - h * 0.16, px, py);
  }
  ctx.lineTo(x + w, y + h); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  // 浪花
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i <= seg; i++) {
    const px = x + (w * i) / seg, py = y + Math.sin(i * 2.1) * h * 0.18;
    ctx.beginPath();
    ctx.arc(px, py, h * 0.09, 0, Math.PI * 2); ctx.fill();
  }
}
function pSun(ctx, x, y, r, c = '#f9d96c') {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.9);
  g.addColorStop(0, c); g.addColorStop(0.55, c + 'aa'); g.addColorStop(1, c + '00');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function pGull(ctx, x, y, s, c = 'rgba(80,95,105,0.75)') {
  ctx.strokeStyle = c; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x - s * 0.5, y, s * 0.5, Math.PI * 1.15, Math.PI * 1.85);
  ctx.arc(x + s * 0.5, y, s * 0.5, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}
function pSakuraBranch(ctx, x, y, len, s, cF = '#f3aec6', cD = '#e58bab') {
  ctx.strokeStyle = '#7a5a48'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + len * 0.45, y - s * 0.5, x + len, y - s * 0.15);
  ctx.stroke();
  ctx.lineWidth = s * 0.08;
  ctx.beginPath(); ctx.moveTo(x + len * 0.4, y - s * 0.38);
  ctx.quadraticCurveTo(x + len * 0.55, y + s * 0.5, x + len * 0.62, y + s * 0.85); ctx.stroke();
  const bloom = (bx, by, r) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? cF : cD;
      ctx.beginPath(); ctx.ellipse(bx + Math.cos(a) * r * 0.6, by + Math.sin(a) * r * 0.6, r * 0.55, r * 0.5, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fbe3ec';
    ctx.beginPath(); ctx.arc(bx, by, r * 0.3, 0, Math.PI * 2); ctx.fill();
  };
  bloom(x + len * 0.2, y - s * 0.42, s * 0.34);
  bloom(x + len * 0.5, y - s * 0.5, s * 0.42);
  bloom(x + len * 0.62, y + s * 0.8, s * 0.3);
  bloom(x + len * 0.85, y - s * 0.2, s * 0.36);
  bloom(x + len, y - s * 0.15, s * 0.26);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = cF;
    ctx.beginPath();
    ctx.ellipse(x + len * (0.3 + Math.random() * 0.7), y + s * (0.5 + Math.random() * 0.9), s * 0.06, s * 0.1, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
function pTent(ctx, x, y, w, h, c = '#e8b23c') {
  // A 帐篷（含门与内部暖光）
  ctx.beginPath();
  ctx.moveTo(x - w * 0.6, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.6, y);
  ctx.closePath(); ctx.fillStyle = c; ctx.fill();
  ctx.fillStyle = 'rgba(120,80,20,0.25)';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.02, y); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.28, y - h * 0.18);
  ctx.lineTo(x + w * 0.3, y); ctx.closePath(); ctx.fill();
  // 门
  ctx.beginPath();
  ctx.moveTo(x - w * 0.16, y); ctx.lineTo(x, y - h * 0.68); ctx.lineTo(x + w * 0.16, y);
  ctx.closePath(); ctx.fillStyle = '#f8d98a'; ctx.fill();
  ctx.strokeStyle = '#a8741f'; ctx.lineWidth = w * 0.03; ctx.stroke();
  // 风绳与旗
  ctx.strokeStyle = 'rgba(90,60,30,0.6)'; ctx.lineWidth = w * 0.02;
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - w * 0.95, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.9, y - h * 0.1); ctx.stroke();
  ctx.fillStyle = '#c05a4e';
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w * 0.14, y - h * 0.96); ctx.lineTo(x, y - h * 0.9);
  ctx.closePath(); ctx.fill();
}
function pFire(ctx, x, y, s) {
  // 柴堆
  ctx.strokeStyle = '#6d5138'; ctx.lineWidth = s * 0.14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x + s * 0.5, y - s * 0.16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.16); ctx.lineTo(x + s * 0.5, y); ctx.stroke();
  // 火焰
  const flame = (fx, fy, fw, fh, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx - fw, fy - fh * 0.4, fx - fw * 0.2, fy - fh * 0.75);
    ctx.quadraticCurveTo(fx - fw * 0.1, fy - fh, fx, fy - fh);
    ctx.quadraticCurveTo(fx + fw * 0.2, fy - fh * 0.8, fx + fw * 0.3, fy - fh * 0.45);
    ctx.quadraticCurveTo(fx + fw * 0.5, fy - fh * 0.2, fx, fy);
    ctx.fill();
  };
  flame(x, y - s * 0.08, s * 0.34, s * 0.95, '#e8752e');
  flame(x + s * 0.04, y - s * 0.08, s * 0.22, s * 0.62, '#f6c14b');
  // 火星
  ctx.fillStyle = '#f6c14b';
  ctx.beginPath(); ctx.arc(x - s * 0.3, y - s * 0.9, s * 0.045, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + s * 0.34, y - s * 1.05, s * 0.05, 0, 7); ctx.fill();
}
function pTrain(ctx, x, y, w, P) {
  // 侧视列车：车头朝左
  const h = w * 0.32;
  shOn(ctx, 7, 4, 'rgba(50,60,75,0.35)');
  // 后车
  ctx.fillStyle = P.body;
  rr(ctx, x + w * 0.42, y - h * 0.72, w * 0.56, h * 0.62, w * 0.015); ctx.fill();
  // 前车
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.1);
  ctx.quadraticCurveTo(x, y - h * 0.72, x + w * 0.1, y - h * 0.72);
  ctx.lineTo(x + w * 0.4, y - h * 0.72);
  ctx.lineTo(x + w * 0.4, y - h * 0.1);
  ctx.closePath();
  ctx.fillStyle = P.body; ctx.fill();
  shOff(ctx);
  // 车窗（暖光）
  ctx.fillStyle = P.warm;
  for (let i = 0; i < 3; i++) rr(ctx, x + w * (0.14 + i * 0.1), y - h * 0.6, w * 0.075, h * 0.3, w * 0.01), ctx.fill();
  for (let i = 0; i < 3; i++) rr(ctx, x + w * (0.5 + i * 0.11), y - h * 0.6, w * 0.075, h * 0.3, w * 0.01), ctx.fill();
  // 奶油色带 + 红条
  ctx.fillStyle = P.band; ctx.fillRect(x, y - h * 0.26, w * 0.98, h * 0.14);
  ctx.fillStyle = P.red; ctx.fillRect(x, y - h * 0.12, w * 0.98, h * 0.05);
  // 车头
  ctx.fillStyle = '#3d4753';
  ctx.beginPath(); ctx.arc(x + w * 0.045, y - h * 0.16, w * 0.02, 0, 7); ctx.fill();
  ctx.fillStyle = '#dfe6ec';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.01, y - h * 0.45); ctx.quadraticCurveTo(x + w * 0.075, y - h * 0.52, x + w * 0.09, y - h * 0.38);
  ctx.lineTo(x + w * 0.01, y - h * 0.32); ctx.closePath(); ctx.fill();
  // 车轮与雪雾
  ctx.fillStyle = '#333a44';
  for (const wx of [x + w * 0.12, x + w * 0.3, x + w * 0.52, x + w * 0.7, x + w * 0.88]) {
    ctx.beginPath(); ctx.arc(wx, y - h * 0.06, w * 0.022, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const wx of [x + w * 0.2, x + w * 0.6, x + w * 0.92]) {
    ctx.beginPath(); ctx.arc(wx, y - h * 0.02, w * 0.018, 0, 7); ctx.fill();
  }
  // 车顶积雪
  ctx.fillStyle = '#ffffff';
  rr(ctx, x + w * 0.08, y - h * 0.8, w * 0.9, h * 0.09, h * 0.045); ctx.fill();
}
function pLighthouse(ctx, x, y, w, h) {
  // 基岩
  ctx.fillStyle = '#8a95a0';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.75, y); ctx.quadraticCurveTo(x - w * 0.3, y - h * 0.1, x, y - h * 0.08);
  ctx.quadraticCurveTo(x + w * 0.45, y - h * 0.12, x + w * 0.8, y);
  ctx.closePath(); ctx.fill();
  // 塔身（红白条纹）
  const bw = w * 0.44;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? '#fbf8f0' : '#d95f4b';
    const sy = y - h * 0.06 - (h * 0.78 / 5) * (i + 1), sh = h * 0.78 / 5 + 1;
    const sw1 = bw * (1 - i * 0.1), sw2 = bw * (1 - (i + 1) * 0.1);
    ctx.beginPath();
    ctx.moveTo(x - sw1 / 2, sy + sh); ctx.lineTo(x + sw1 / 2, sy + sh);
    ctx.lineTo(x + sw2 / 2, sy); ctx.lineTo(x - sw2 / 2, sy);
    ctx.closePath(); ctx.fill();
  }
  // 灯室
  ctx.fillStyle = '#3d4753';
  ctx.fillRect(x - w * 0.2, y - h * 0.95, w * 0.4, h * 0.1);
  ctx.fillStyle = '#f9d96c';
  rr(ctx, x - w * 0.15, y - h * 0.93, w * 0.3, h * 0.07, w * 0.02); ctx.fill();
  ctx.fillStyle = '#d95f4b';
  ctx.beginPath(); ctx.moveTo(x - w * 0.24, y - h * 0.95); ctx.lineTo(x, y - h * 1.02); ctx.lineTo(x + w * 0.24, y - h * 0.95);
  ctx.closePath(); ctx.fill();
  // 门
  ctx.fillStyle = '#4a5560';
  rr(ctx, x - w * 0.09, y - h * 0.16, w * 0.18, h * 0.1, w * 0.05); ctx.fill();
}
function pSailboat(ctx, x, y, w, h) {
  // 船体
  ctx.fillStyle = '#9a704a';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - h * 0.16);
  ctx.quadraticCurveTo(x, y + h * 0.02, x + w * 0.5, y - h * 0.16);
  ctx.lineTo(x + w * 0.38, y - h * 0.22);
  ctx.lineTo(x - w * 0.38, y - h * 0.22);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8d98a'; ctx.fillRect(x - w * 0.4, y - h * 0.235, w * 0.8, h * 0.02);
  // 主帆 + 前帆
  shOn(ctx, 5, 3, 'rgba(80,90,100,0.25)');
  ctx.fillStyle = '#fbf8f1';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.06, y - h * 0.92); ctx.quadraticCurveTo(x + w * 0.3, y - h * 0.5, x + w * 0.06, y - h * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.05, y - h * 0.78); ctx.quadraticCurveTo(x - w * 0.36, y - h * 0.42, x - w * 0.05, y - h * 0.2);
  ctx.closePath(); ctx.fill();
  shOff(ctx);
  // 桅杆与旗
  ctx.strokeStyle = '#6d5138'; ctx.lineWidth = w * 0.03;
  ctx.beginPath(); ctx.moveTo(x + w * 0.02, y - h * 0.2); ctx.lineTo(x + w * 0.02, y - h); ctx.stroke();
  ctx.fillStyle = '#d95f4b';
  ctx.beginPath(); ctx.moveTo(x + w * 0.04, y - h); ctx.lineTo(x + w * 0.16, y - h * 0.96); ctx.lineTo(x + w * 0.04, y - h * 0.92);
  ctx.closePath(); ctx.fill();
}
function pTreeA(ctx, x, y, s, c) {
  ctx.fillStyle = '#6d5138';
  ctx.fillRect(x - s * 0.045, y - s * 0.4, s * 0.09, s * 0.42);
  const blobs = [[0, -0.62, 0.32], [-0.22, -0.44, 0.24], [0.22, -0.46, 0.26], [0, -0.4, 0.3]];
  shOn(ctx, 5, 3, 'rgba(110,70,30,0.25)');
  blobs.forEach(([bx, by, br], i) => {
    ctx.fillStyle = i % 2 ? c : shade(c, -14);
    ctx.beginPath(); ctx.arc(x + bx * s, y + by * s, br * s, 0, 7); ctx.fill();
  });
  shOff(ctx);
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}
function pMist(ctx, x, y, w, h, c = 'rgba(255,255,255,0.75)') {
  ctx.fillStyle = c;
  for (let i = 0; i < 4; i++) {
    const bx = x + w * (0.12 + i * 0.24), by = y + Math.sin(i * 1.7) * h * 0.3;
    ctx.beginPath(); ctx.ellipse(bx, by, w * 0.2, h * 0.28, 0, 0, 7); ctx.fill();
  }
}

// ============================================================
//  照片插画（拍立得 / 明信片内画）—— 每个独立小场景
// ============================================================
function illust(ctx, W, H, id) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  const S = W / 640;
  if (id.startsWith('winter')) {
    vgrad(ctx, 0, 0, W, H, PAL.W.sky1, PAL.W.sky2);
    // 雪山
    pRange(ctx, -W * 0.05, H * 0.42, W * 0.6, H * 0.4, '#c3d6e8', '#a5bed6', true, 1);
    pRange(ctx, W * 0.35, H * 0.36, W * 0.7, H * 0.5, '#d3e3f1', '#b6cbdf', true, 2);
    // 雪原
    ctx.fillStyle = '#f4f8fb'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
    ctx.fillStyle = '#e4edf5';
    ctx.beginPath(); ctx.ellipse(W * 0.3, H * 0.78, W * 0.3, H * 0.05, 0, 0, 7); ctx.fill();
    if (id === 'winter-platform') {
      pTrain(ctx, W * 0.12, H * 0.7, W * 0.76, PAL.W);
      // 站台
      ctx.fillStyle = '#d7dde2'; ctx.fillRect(0, H * 0.76, W, H * 0.1);
      ctx.fillStyle = '#f4b94e'; ctx.fillRect(0, H * 0.755, W, H * 0.012);
      // 站灯
      for (const lx of [W * 0.16, W * 0.84]) {
        ctx.strokeStyle = '#55606c'; ctx.lineWidth = 5 * S;
        ctx.beginPath(); ctx.moveTo(lx, H * 0.86); ctx.lineTo(lx, H * 0.3); ctx.stroke();
        ctx.fillStyle = '#f4b94e';
        ctx.beginPath(); ctx.arc(lx, H * 0.29, 14 * S, 0, 7); ctx.fill();
        const g = ctx.createRadialGradient(lx, H * 0.3, 4, lx, H * 0.3, 90 * S);
        g.addColorStop(0, 'rgba(244,185,78,0.5)'); g.addColorStop(1, 'rgba(244,185,78,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, H * 0.3, 90 * S, 0, 7); ctx.fill();
      }
      // 雪
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, (1.5 + Math.random() * 3) * S, 0, 7); ctx.fill();
      }
    } else if (id === 'winter-window') {
      // 车窗框（细框，窗外雪山明亮）
      const fr = 34 * S;
      ctx.fillStyle = '#eef4f9'; ctx.fillRect(0, 0, W, H);
      // 窗外雪山
      ctx.save();
      ctx.translate(fr, fr);
      const iw = W - fr * 2, ih = H - fr * 2;
      vgrad(ctx, 0, 0, iw, ih, '#cfdff0', '#f2f7fb');
      pRange(ctx, -iw * 0.05, ih * 0.2, iw * 0.7, ih * 0.6, '#c3d6e8', '#a5bed6', true, 1);
      pRange(ctx, iw * 0.4, ih * 0.15, iw * 0.65, ih * 0.7, '#d3e3f1', '#b6cbdf', true, 2);
      ctx.fillStyle = '#f4f8fb'; ctx.fillRect(0, ih * 0.7, iw, ih * 0.3);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath(); ctx.arc(Math.random() * iw, Math.random() * ih, 1.6 * S, 0, 7); ctx.fill();
      }
      ctx.restore();
      // 窗框 + 中柱
      ctx.strokeStyle = '#4a5560'; ctx.lineWidth = fr * 0.62;
      ctx.strokeRect(fr * 0.66, fr * 0.66, W - fr * 1.32, H - fr * 1.32);
      ctx.fillStyle = '#4a5560'; ctx.fillRect(W * 0.485, fr * 0.66, 10 * S, H - fr * 1.32);
      // 窗台小桌 + 橘子 + 热茶
      ctx.fillStyle = '#8a6a4d';
      ctx.fillRect(W * 0.1, H * 0.78, W * 0.8, 10 * S);
      ctx.fillStyle = '#e8983c';
      ctx.beginPath(); ctx.arc(W * 0.24, H * 0.74, 20 * S, 0, 7); ctx.fill();
      ctx.fillStyle = '#6d8a4a';
      ctx.beginPath(); ctx.ellipse(W * 0.24, H * 0.74 - 20 * S, 7 * S, 3 * S, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#d95f4b';
      rr(ctx, W * 0.6, H * 0.66, 26 * S, 24 * S, 4 * S); ctx.fill();
      pMist(ctx, W * 0.52, H * 0.6, W * 0.22, H * 0.16, 'rgba(255,255,255,0.8)');
    } else if (id === 'winter-inn') {
      // 温泉旅馆
      pHouse(ctx, W * 0.14, H * 0.72, W * 0.24, H * 0.3, '#f2ead8', '#4d5c66', '#f4b94e');
      pHouse(ctx, W * 0.46, H * 0.74, W * 0.2, H * 0.26, '#f2ead8', '#54636d', '#f4b94e');
      // 温泉池 + 蒸汽
      ctx.fillStyle = '#bcd7e2'; rr(ctx, W * 0.3, H * 0.8, W * 0.4, H * 0.1, 20 * S); ctx.fill();
      pMist(ctx, W * 0.25, H * 0.72, W * 0.5, H * 0.2, 'rgba(255,255,255,0.8)');
      pPine(ctx, W * 0.82, H * 0.7, 90 * S, '#4d6a63', 0.9);
      pPine(ctx, W * 0.9, H * 0.75, 70 * S, '#54726a', 0.9);
    } else {
      // 雪原 + 列车远景
      pTrain(ctx, W * 0.3, H * 0.82, W * 0.4, PAL.W);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, (1 + Math.random() * 2.2) * S, 0, 7); ctx.fill();
    }
  } else if (id.startsWith('spring')) {
    vgrad(ctx, 0, 0, W, H, '#e9f2ea', '#f9f2f0');
    if (id === 'spring-bridge') {
      // 石桥
      ctx.fillStyle = '#b9cdd0'; ctx.fillRect(0, H * 0.62, W, H * 0.38);
      ctx.fillStyle = '#9aa4a6';
      ctx.beginPath();
      ctx.moveTo(W * 0.12, H * 0.62);
      ctx.quadraticCurveTo(W * 0.5, H * 0.2, W * 0.88, H * 0.62);
      ctx.lineTo(W * 0.88, H * 0.7); ctx.quadraticCurveTo(W * 0.5, H * 0.42, W * 0.12, H * 0.7);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7c8689'; ctx.lineWidth = 4 * S;
      for (let i = 0; i < 9; i++) {
        const bx = W * (0.15 + i * 0.085);
        const by = H * 0.62 - Math.sin((i / 8) * Math.PI) * H * 0.24;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 20 * S); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(W * 0.13, H * 0.4);
      ctx.quadraticCurveTo(W * 0.5, H * 0.24, W * 0.87, H * 0.4); ctx.stroke();
      // 拱洞倒影
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.78, W * 0.13, H * 0.06, 0, 0, 7); ctx.fill();
      pSakuraBranch(ctx, W * 0.05, H * 0.16, W * 0.3, 70 * S);
      pSakuraBranch(ctx, W * 0.72, H * 0.1, W * 0.26, 60 * S);
      // 摇橹船远影
      ctx.fillStyle = '#8a6a4d';
      ctx.beginPath(); ctx.ellipse(W * 0.32, H * 0.84, 60 * S, 16 * S, 0, 0, 7); ctx.fill();
    } else if (id === 'spring-boat') {
      ctx.fillStyle = '#9fc6cb'; ctx.fillRect(0, H * 0.45, W, H * 0.55);
      // 水纹
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3 * S;
      for (let i = 0; i < 6; i++) {
        const wy = H * (0.5 + i * 0.09);
        ctx.beginPath();
        ctx.moveTo(W * 0.05, wy);
        for (let x = 0; x < W; x += 60 * S) ctx.quadraticCurveTo(x + 30 * S, wy - 6 * S, x + 60 * S, wy);
        ctx.stroke();
      }
      // 船
      shOn(ctx, 8, 5);
      ctx.fillStyle = '#8a6a4d';
      ctx.beginPath();
      ctx.moveTo(W * 0.18, H * 0.62); ctx.quadraticCurveTo(W * 0.5, H * 0.74, W * 0.82, H * 0.62);
      ctx.quadraticCurveTo(W * 0.5, H * 0.66, W * 0.18, H * 0.62);
      ctx.closePath(); ctx.fill(); shOff(ctx);
      ctx.fillStyle = '#f9f5ea';
      ctx.beginPath(); ctx.arc(W * 0.44, H * 0.6, 44 * S, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#5e6f80';
      ctx.beginPath(); ctx.arc(W * 0.44, H * 0.6, 40 * S, Math.PI * 0.85, Math.PI * 2.15); ctx.fill();
      ctx.fillStyle = '#f9f5ea';
      ctx.beginPath(); ctx.arc(W * 0.44, H * 0.6, 32 * S, Math.PI, 0); ctx.fill();
      // 船娘
      ctx.fillStyle = '#3d4753';
      ctx.beginPath(); ctx.arc(W * 0.66, H * 0.55, 13 * S, 0, 7); ctx.fill();
      ctx.fillStyle = '#2d5a8a';
      rr(ctx, W * 0.63, H * 0.575, 26 * S, 34 * S, 8 * S); ctx.fill();
      ctx.strokeStyle = '#6d5138'; ctx.lineWidth = 4 * S;
      ctx.beginPath(); ctx.moveTo(W * 0.7, H * 0.6); ctx.lineTo(W * 0.8, H * 0.82); ctx.stroke();
      // 樱瓣
      ctx.fillStyle = '#f3aec6';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * W, Math.random() * H * 0.9, 5 * S, 8 * S, Math.random() * 3, 0, 7); ctx.fill();
      }
      pSakuraBranch(ctx, W * 0.55, H * 0.05, W * 0.42, 66 * S);
    } else if (id === 'spring-ticket') {
      vgrad(ctx, 0, 0, W, H, '#dcebe2', '#f2f6ee');
      pSakuraBranch(ctx, W * 0.06, H * 0.2, W * 0.4, 80 * S);
      ctx.fillStyle = 'rgba(243,174,198,0.5)';
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * W, Math.random() * H, 5 * S, 8 * S, Math.random() * 3, 0, 7); ctx.fill();
      }
      pHouse(ctx, W * 0.2, H * 0.85, W * 0.17, H * 0.28, '#f9f5ea', '#46555e');
      pHouse(ctx, W * 0.42, H * 0.9, W * 0.15, H * 0.22, '#f9f5ea', '#52606a');
      pHouse(ctx, W * 0.64, H * 0.87, W * 0.16, H * 0.25, '#f9f5ea', '#46555e');
    } else {
      // 樱花巷
      vgrad(ctx, 0, 0, W, H, '#f4e4ec', '#faf3ef');
      pHouse(ctx, W * 0.06, H * 0.88, W * 0.22, H * 0.4, '#f6f2e8', '#5d6d78');
      pHouse(ctx, W * 0.52, H * 0.92, W * 0.2, H * 0.34, '#f6f2e8', '#52626c');
      // 晾衣绳
      ctx.strokeStyle = '#8a7a68'; ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.moveTo(W * 0.24, H * 0.52); ctx.quadraticCurveTo(W * 0.5, H * 0.6, W * 0.6, H * 0.55); ctx.stroke();
      const cloth = ['#7d9bbd', '#d9e4ee', '#b5c9dd'];
      cloth.forEach((cc, i) => {
        ctx.fillStyle = cc;
        rr(ctx, W * (0.3 + i * 0.09), H * 0.54, 30 * S, 44 * S, 4 * S); ctx.fill();
      });
      pSakuraBranch(ctx, W * 0.3, H * 0.16, W * 0.34, 84 * S);
      pSakuraBranch(ctx, W * 0.68, H * 0.06, W * 0.34, 76 * S);
      ctx.fillStyle = '#f3aec6';
      for (let i = 0; i < 26; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * W, Math.random() * H, 5 * S, 8 * S, Math.random() * 3, 0, 7); ctx.fill();
      }
    }
  } else if (id.startsWith('summer')) {
    vgrad(ctx, 0, 0, W, H, PAL.U.sky1, PAL.U.sky2);
    if (id !== 'summer-ticket') {
      pSun(ctx, W * 0.8, H * 0.18, 44 * S, '#f9d96c');
      pGull(ctx, W * 0.3, H * 0.16, 20 * S); pGull(ctx, W * 0.42, H * 0.24, 15 * S);
      // 远岛
      ctx.fillStyle = '#a8ccc9';
      ctx.beginPath(); ctx.ellipse(W * 0.2, H * 0.48, W * 0.18, H * 0.05, 0, Math.PI, 0); ctx.fill();
    }
    if (id === 'summer-lighthouse') {
      pLighthouse(ctx, W * 0.62, H * 0.78, W * 0.3, H * 0.55);
      pWave(ctx, -W * 0.05, H * 0.74, W * 0.5, H * 0.24, '#6cc3d3', '#3f97ad');
      pWave(ctx, W * 0.4, H * 0.8, W * 0.65, H * 0.22, '#57b6c8', '#2f8aa2');
      ctx.fillStyle = '#f2e2ba'; ctx.fillRect(0, H * 0.9, W, H * 0.1);
    } else if (id === 'summer-sail') {
      pWave(ctx, -W * 0.05, H * 0.68, W * 1.1, H * 0.3, '#57b6c8', '#2f8aa2');
      pSailboat(ctx, W * 0.42, H * 0.72, W * 0.42, H * 0.5);
      pGull(ctx, W * 0.66, H * 0.3, 18 * S);
    } else if (id === 'summer-wave') {
      pWave(ctx, -W * 0.05, H * 0.5, W * 1.1, H * 0.28, '#6cc3d3', '#3f97ad');
      pWave(ctx, -W * 0.05, H * 0.66, W * 1.1, H * 0.3, '#57b6c8', '#2f8aa2');
      ctx.fillStyle = '#f2e2ba'; ctx.fillRect(0, H * 0.82, W, H * 0.18);
      ctx.fillStyle = 'rgba(214,186,132,0.7)';
      for (let i = 0; i < 24; i++) {
        ctx.beginPath(); ctx.arc(Math.random() * W, H * (0.85 + Math.random() * 0.13), 3 * S, 0, 7); ctx.fill();
      }
    } else {
      // 渡轮
      pWave(ctx, -W * 0.05, H * 0.66, W * 1.1, H * 0.32, '#57b6c8', '#2f8aa2');
      ctx.fillStyle = '#fbf8f0';
      rr(ctx, W * 0.22, H * 0.5, W * 0.56, H * 0.2, 10 * S); ctx.fill();
      rr(ctx, W * 0.3, H * 0.42, W * 0.4, H * 0.1, 8 * S); ctx.fill();
      ctx.fillStyle = '#3f97ad';
      for (let i = 0; i < 5; i++) ctx.fillRect(W * (0.33 + i * 0.08), H * 0.44, 20 * S, 10 * S);
      ctx.fillStyle = '#d95f4b'; ctx.fillRect(W * 0.22, H * 0.5, W * 0.56, H * 0.025);
    }
  } else {
    // 秋
    vgrad(ctx, 0, 0, W, H, PAL.A.sky1, PAL.A.sky2);
    if (id !== 'autumn-ticket') {
      ctx.fillStyle = '#5b4a6b';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H * 0.2, 1.6 * S, 0, 7); ctx.fill();
      }
    }
    if (id === 'autumn-camp') {
      pRange(ctx, -W * 0.05, H * 0.4, W * 0.75, H * 0.42, '#d98d54', '#b5622f', false, 1);
      pRange(ctx, W * 0.5, H * 0.36, W * 0.55, H * 0.46, '#c8773d', '#a05427', false, 2);
      ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      pTent(ctx, W * 0.38, H * 0.86, W * 0.3, H * 0.3);
      pTreeA(ctx, W * 0.12, H * 0.7, 110 * S, '#d07c35');
      pTreeA(ctx, W * 0.85, H * 0.72, 90 * S, '#a8442e');
    } else if (id === 'autumn-fire') {
      // 夜晚营地
      vgrad(ctx, 0, 0, W, H, '#3d3a54', '#6b5568');
      ctx.fillStyle = '#f2e6c8';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H * 0.7, 1.6 * S, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#4a4054'; ctx.fillRect(0, H * 0.74, W, H * 0.26);
      pTent(ctx, W * 0.24, H * 0.9, W * 0.26, H * 0.26, '#d99c30');
      pFire(ctx, W * 0.62, H * 0.88, 90 * S);
      const g = ctx.createRadialGradient(W * 0.62, H * 0.8, 10, W * 0.62, H * 0.8, 200 * S);
      g.addColorStop(0, 'rgba(246,193,75,0.4)'); g.addColorStop(1, 'rgba(246,193,75,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (id === 'autumn-dawn') {
      pRange(ctx, -W * 0.05, H * 0.55, W * 0.6, H * 0.4, '#8a4a2c', '#6b3a22', false, 2);
      pRange(ctx, W * 0.3, H * 0.45, W * 0.5, H * 0.5, '#d98d54', '#b5622f', false, 1);
      pRange(ctx, W * 0.6, H * 0.35, W * 0.5, H * 0.55, '#f0c795', '#d98d54', false, 2);
      pSun(ctx, W * 0.7, H * 0.3, 50 * S, '#f9d96c');
      pMist(ctx, W * 0.1, H * 0.52, W * 0.8, H * 0.2, 'rgba(255,244,228,0.7)');
    } else {
      // 林道
      pRange(ctx, W * 0.3, H * 0.42, W * 0.75, H * 0.4, '#d98d54', '#b5622f', false, 2);
      ctx.fillStyle = '#c9a06a'; ctx.fillRect(0, H * 0.66, W, H * 0.34);
      ctx.fillStyle = 'rgba(150,110,60,0.55)';
      ctx.beginPath(); ctx.moveTo(W * 0.3, H * 1); ctx.quadraticCurveTo(W * 0.52, H * 0.8, W * 0.62, H * 0.66);
      ctx.lineTo(W * 0.72, H * 0.66); ctx.quadraticCurveTo(W * 0.68, H * 0.85, W * 0.52, H * 1);
      ctx.closePath(); ctx.fill();
      pTreeA(ctx, W * 0.1, H * 0.7, 120 * S, '#d07c35');
      pTreeA(ctx, W * 0.86, H * 0.66, 100 * S, '#a8442e');
      pTreeA(ctx, W * 0.26, H * 0.78, 70 * S, '#e0a34a');
    }
  }
  ctx.restore();
  grain(ctx, W, H, 500, 0.04);
}

// ============================================================
//  照片成品（拍立得 / 明信片 / 票根）+ 弹窗大图
// ============================================================
function stampDraw(ctx, x, y, w, seasonIdx, value = 63) {
  const P = [PAL.W, PAL.S, PAL.U, PAL.A][seasonIdx];
  const h = w * 1.22;
  shOn(ctx, 5, 3, 'rgba(90,60,30,0.3)');
  ctx.fillStyle = '#fdfcf8';
  rr(ctx, x, y, w, h, 4); ctx.fill();
  shOff(ctx);
  // 齿孔
  ctx.fillStyle = '#e8e2d2';
  const n = 9;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.arc(x + (w * i) / n, y, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + (w * i) / n, y + h, 2.6, 0, 7); ctx.fill();
  }
  for (let i = 0; i <= 11; i++) {
    ctx.beginPath(); ctx.arc(x, y + (h * i) / 11, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w, y + (h * i) / 11, 2.6, 0, 7); ctx.fill();
  }
  const pad = w * 0.09;
  ctx.fillStyle = ['rgba(91,127,174,0.25)', 'rgba(217,137,164,0.25)', 'rgba(61,150,168,0.25)', 'rgba(196,118,58,0.28)'][seasonIdx];
  ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  // 中央图标
  const cx = x + w / 2, cy = y + h * 0.44, r = w * 0.26;
  ctx.strokeStyle = ['#5b7fae', '#d989a4', '#3d96a8', '#c4763a'][seasonIdx];
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 2.4;
  if (seasonIdx === 0) { // 雪花
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, 7); ctx.fill();
  } else if (seasonIdx === 1) { // 杏花
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.45, r * 0.4, a, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, 7); ctx.fill();
  } else if (seasonIdx === 2) { // 浪
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.3);
    ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.5, cx, cy + r * 0.1);
    ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.2, cx + r, cy - r * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
    ctx.quadraticCurveTo(cx, cy + r * 0.3, cx + r * 0.7, cy + r * 0.5);
    ctx.stroke();
  } else { // 枫叶
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = a + 0.5;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#6b5f4e';
  ctx.textAlign = 'center';
  ctx.font = font(w * 0.14, 600, SANS);
  ctx.fillText('四季郵便', cx, y + h * 0.2);
  ctx.font = font(w * 0.2, 600, SANS);
  ctx.fillText(value, cx, y + h * 0.88);
  return h;
}
function postmarkDraw(ctx, x, y, r, city, date) {
  ctx.save();
  ctx.strokeStyle = 'rgba(90,70,60,0.75)'; ctx.fillStyle = 'rgba(90,70,60,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, 7); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = font(r * 0.42, 600, SANS);
  ctx.fillText(city, x, y + r * 0.1);
  ctx.font = font(r * 0.3, 400, SANS);
  ctx.fillText(date, x, y + r * 0.5);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + r, y - r * 0.4 + i * r * 0.38);
    ctx.quadraticCurveTo(x + r * 1.6, y - r * 0.3 + i * r * 0.38, x + r * 2.2, y - r * 0.45 + i * r * 0.38);
    ctx.stroke();
  }
  ctx.restore();
}
function photoCanvas(pid) {
  const p = PHOTOS[pid];
  const seasonIdx = p.chapter;
  if (p.type === 'polaroid') {
    const W = 680, H = 760;
    const [c, ctx] = cv(W, H);
    shOn(ctx, 6, 4, 'rgba(80,60,40,0.2)');
    ctx.fillStyle = '#fcfbf7';
    rr(ctx, 6, 6, W - 12, H - 12, 4); ctx.fill();
    shOff(ctx);
    // 内画
    const [ic, ictx] = cv(W - 96, W - 96 + 40);
    illust(ictx, ic.width, ic.height, pid);
    ctx.drawImage(ic, 48, 48);
    ctx.strokeStyle = 'rgba(70,55,40,0.25)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, ic.width, ic.height);
    // 手写标题
    ctx.fillStyle = '#4a4038';
    ctx.textAlign = 'left';
    ctx.font = font(40, 400, HAND);
    ctx.fillText(p.title, 52, H - 78);
    ctx.textAlign = 'right';
    ctx.font = font(24, 400, SANS);
    ctx.fillStyle = '#8a7f72';
    ctx.fillText(p.date, W - 52, H - 74);
    grain(ctx, W, H, 700, 0.03);
    return c;
  }
  if (p.type === 'postcard') {
    const W = 920, H = 640;
    const [c, ctx] = cv(W, H);
    shOn(ctx, 6, 4, 'rgba(80,60,40,0.2)');
    ctx.fillStyle = '#f8f3e6';
    rr(ctx, 6, 6, W - 12, H - 12, 5); ctx.fill();
    shOff(ctx);
    const [ic, ictx] = cv(W - 48, 400);
    illust(ictx, ic.width, 400, pid);
    ctx.drawImage(ic, 24, 24);
    ctx.strokeStyle = 'rgba(70,55,40,0.25)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, ic.width, 400);
    // 分隔线
    ctx.strokeStyle = 'rgba(120,100,80,0.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W * 0.52, 452); ctx.lineTo(W * 0.52, H - 30); ctx.stroke();
    // 左：手写留言
    ctx.fillStyle = '#4a4038';
    ctx.textAlign = 'left';
    ctx.font = font(30, 400, HAND);
    ctx.fillText('想念有声音吗？', 46, 502);
    ctx.fillText('这一页春天，先寄给你。', 46, 552);
    ctx.strokeStyle = 'rgba(120,100,80,0.4)';
    ctx.lineWidth = 1.2;
    for (const ly of [510, 560]) {
      ctx.beginPath(); ctx.moveTo(40, ly + 8); ctx.lineTo(W * 0.46, ly + 8); ctx.stroke();
    }
    // 右：地址线 + 邮票 + 邮戳
    for (const ly of [502, 556]) {
      ctx.beginPath(); ctx.moveTo(W * 0.58, ly); ctx.lineTo(W - 46, ly); ctx.stroke();
    }
    ctx.font = font(22, 400, SANS);
    ctx.fillStyle = '#8a7f72';
    ctx.fillText('POST CARD · 四季旅行記憶', W * 0.58, 610);
    stampDraw(ctx, W - 210, 462, 120, seasonIdx, [63, 80, 100, 120][seasonIdx]);
    postmarkDraw(ctx, W - 250, 530, 52, CHAPTERS[seasonIdx].city, p.date.slice(5));
    grain(ctx, W, H, 900, 0.035);
    return c;
  }
  // ticket
  const W = 920, H = 400;
  const [c, ctx] = cv(W, H);
  const P = [PAL.W, PAL.S, PAL.U, PAL.A][seasonIdx];
  shOn(ctx, 6, 4, 'rgba(80,60,40,0.2)');
  ctx.fillStyle = '#fdfbf4';
  rr(ctx, 6, 6, W - 12, H - 12, 8); ctx.fill();
  shOff(ctx);
  // 顶部色带
  ctx.fillStyle = P.accent ?? ['#5b7fae', '#d989a4', '#3d96a8', '#c4763a'][seasonIdx];
  rr(ctx, 20, 20, W - 40, 74, 6); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = font(26, 600, SANS);
  ctx.fillText('四季旅行 · SIZI JOURNEY LINE', 44, 52);
  ctx.font = font(30, 400, HAND);
  ctx.fillText(p.title, 44, 84);
  ctx.textAlign = 'right';
  ctx.font = font(24, 600, SANS);
  ctx.fillText(`NO.0${seasonIdx + 1}-${p.date.replaceAll('.', '')}`, W - 44, 68);
  // 主信息
  ctx.fillStyle = '#3a342c';
  ctx.textAlign = 'left';
  const route = p.loc.replace(' · ', '  →  ').replace(' → ', '  →  ');
  ctx.font = font(34, 600, SANS);
  const rShort = route.split('  →  ').slice(0, 2).join(' → ');
  ctx.fillText(rShort.length > 18 ? rShort.slice(0, 18) : rShort, 44, 156);
  ctx.font = font(22, 400, SANS);
  ctx.fillStyle = '#6b6154';
  ctx.fillText(`日期 ${p.date}`, 44, 204);
  ctx.fillText(`地点 ${p.loc}`, 44, 240);
  ctx.fillText(`${p.facts[0] ?? ''}`, 44, 276);
  // 条码
  ctx.fillStyle = '#3a342c';
  let bx = 44;
  for (let i = 0; i < 46 && bx < 560; i++) {
    const bw = 2 + Math.round(Math.random() * 3);
    ctx.fillRect(bx, 306, bw, 46);
    bx += bw + 2 + Math.round(Math.random() * 3);
  }
  // 打孔分隔线 + 副券
  const px = W - 190;
  ctx.strokeStyle = 'rgba(120,100,80,0.55)'; ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(px, 30); ctx.lineTo(px, H - 30); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fdfbf4';
  for (const py of [24, H - 24]) {
    ctx.beginPath(); ctx.arc(px, py, 12, 0, 7); ctx.globalCompositeOperation = 'destination-out'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(120,100,80,0.35)'; ctx.stroke();
  }
  ctx.save();
  ctx.translate(px + 68, H / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#6b6154';
  ctx.textAlign = 'center';
  ctx.font = font(22, 600, SANS);
  ctx.fillText('ADMIT ONE · 副券', 0, -6);
  ctx.font = font(18, 400, SANS);
  ctx.fillText(p.date, 0, 22);
  ctx.restore();
  // 季节小戳
  stampDraw(ctx, W - 320, 128, 84, seasonIdx, [63, 80, 100, 120][seasonIdx]);
  grain(ctx, W, H, 800, 0.035);
  return c;
}

// ============================================================
//  弹窗大图（复用照片绘制，独立大尺寸）
// ============================================================
const dataURLCache = new Map();
export function photoDataURL(pid) {
  if (dataURLCache.has(pid)) return dataURLCache.get(pid);
  const c = photoCanvas(pid);
  const url = c.toDataURL('image/jpeg', 0.92);
  dataURLCache.set(pid, url);
  return url;
}

// ============================================================
//  立体纸艺部件贴图（透明背景剪影画）
// ============================================================
const artDefs = {
  // —— 冬 ——
  'winter-range': { w: 4.6, h: 1.9, draw(ctx, W, H) {
    vgrad(ctx, 0, 0, W, H * 0.1, 'rgba(255,255,255,0)', 'rgba(255,255,255,0)');
    pRange(ctx, -W * 0.03, H * 0.06, W * 1.06, H * 0.94, '#cfdfef', '#a9c3dc', true, 1);
    ctx.fillStyle = '#e9f1f8';
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.98, W * 0.55, H * 0.1, 0, 0, 7); ctx.fill();
  } },
  'winter-pines': { w: 3.6, h: 1.25, draw(ctx, W, H) {
    ctx.fillStyle = '#eef4f9';
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.92, W * 0.52, H * 0.16, 0, 0, 7); ctx.fill();
    for (const [fx, s, c] of [[0.08, 0.9, '#4d6a63'], [0.2, 1.15, '#54726a'], [0.36, 0.8, '#4d6a63'], [0.55, 1.05, '#54726a'], [0.72, 0.85, '#4d6a63'], [0.88, 1.1, '#54726a']]) {
      pPine(ctx, W * fx, H * 0.86, H * s, c, 0.85);
    }
  } },
  'winter-mtn': { w: 2.6, h: 2.0, side: true, draw(ctx, W, H) {
    ctx.beginPath();
    ctx.moveTo(W * 0.02, H * 0.98);
    ctx.lineTo(W * 0.3, H * 0.24);
    ctx.lineTo(W * 0.46, H * 0.42);
    ctx.lineTo(W * 0.62, H * 0.12);
    ctx.lineTo(W * 0.85, H * 0.5);
    ctx.lineTo(W * 0.98, H * 0.98);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#eef4fa'); g.addColorStop(0.6, '#ffffff'); g.addColorStop(1, '#c9d9ea');
    ctx.fillStyle = g; ctx.fill();
    // 蓝色阴影面
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(140,170,200,0.4)';
    ctx.beginPath();
    ctx.moveTo(W * 0.62, H * 0.12); ctx.lineTo(W * 0.85, H * 0.5); ctx.lineTo(W * 0.7, H * 0.98);
    ctx.lineTo(W * 0.55, H * 0.98); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H * 0.24); ctx.lineTo(W * 0.46, H * 0.42); ctx.lineTo(W * 0.4, H * 0.98);
    ctx.lineTo(W * 0.28, H * 0.98); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 雪顶高光
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(W * 0.62, H * 0.12); ctx.lineTo(W * 0.56, H * 0.3); ctx.lineTo(W * 0.68, H * 0.26); ctx.closePath(); ctx.fill();
    // 缆车索道
    ctx.strokeStyle = 'rgba(90,100,115,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W * 0.06, H * 0.5); ctx.quadraticCurveTo(W * 0.45, H * 0.2, W * 0.9, H * 0.42); ctx.stroke();
    ctx.fillStyle = '#c05a4e';
    rr(ctx, W * 0.4, H * 0.235, W * 0.075, H * 0.05, 4); ctx.fill();
    // 山脚松树
    pPine(ctx, W * 0.16, H * 0.97, H * 0.2, '#4d6a63', 0.9);
    pPine(ctx, W * 0.82, H * 0.97, H * 0.16, '#54726a', 0.9);
  } },
  'winter-train': { w: 3.2, h: 1.02, draw(ctx, W, H) {
    pTrain(ctx, W * 0.02, H * 0.86, W * 0.96, PAL.W);
  } },
  'winter-canopy': { w: 3.4, h: 0.62, lean: true, draw(ctx, W, H) {
    // 顶棚：下缘扇贝（自然方向中扇贝在上缘，翻转后垂在视觉下缘）
    ctx.fillStyle = '#3f5a52';
    ctx.fillRect(0, H * 0.28, W, H * 0.4);
    ctx.fillStyle = '#35504a';
    const n = 9;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.arc((W * i) / n, H * 0.28, W / n / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4d6a63';
    ctx.fillRect(0, H * 0.2, W, H * 0.1);
    // 边缘小雪
    ctx.fillStyle = '#fff';
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.arc((W * i) / n, H * 0.2, W / n / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2ead8';
    ctx.font = font(H * 0.2, 600, SANS);
    ctx.fillText('白 泷 町 駅', W / 2, H * 0.55);
  } },
  // —— 春 ——
  'spring-mist': { w: 4.4, h: 1.5, draw(ctx, W, H) {
    pRange(ctx, -W * 0.03, H * 0.18, W * 0.6, H * 0.6, '#bfd8c8', '#a3c2ae', false, 2);
    pRange(ctx, W * 0.45, H * 0.1, W * 0.6, H * 0.7, '#cbdfd0', '#aecab8', false, 1);
    pMist(ctx, W * 0.1, H * 0.62, W * 0.8, H * 0.3, 'rgba(255,255,255,0.85)');
  } },
  'spring-houses': { w: 2.5, h: 1.55, side: true, draw(ctx, W, H) {
    // 白墙民居群（透明景片，屋顶错落）
    pHouse(ctx, W * 0.0, H * 0.6, W * 0.26, H * 0.44, '#f9f5ea', '#46555e', '#f4d98a');
    pHouse(ctx, W * 0.27, H * 0.7, W * 0.2, H * 0.34, '#f9f5ea', '#52606a');
    pHouse(ctx, W * 0.49, H * 0.58, W * 0.26, H * 0.46, '#f9f5ea', '#46555e', '#f4d98a');
    pHouse(ctx, W * 0.77, H * 0.7, W * 0.21, H * 0.32, '#f9f5ea', '#52606a');
    // 石阶基座
    ctx.fillStyle = '#b9c2c4';
    ctx.fillRect(W * 0.02, H * 0.9, W * 0.96, H * 0.08);
    ctx.fillStyle = 'rgba(90,100,102,0.35)';
    for (let i = 0; i < 9; i++) ctx.fillRect(W * (0.04 + i * 0.105), H * 0.9, 2, H * 0.08);
    pTreeA(ctx, W * 0.94, H * 0.9, H * 0.55, '#d3e0c8');
  } },
  'spring-bridge': { w: 2.2, h: 1.0, draw(ctx, W, H) {
    // 拱桥
    ctx.fillStyle = '#9aa4a6';
    ctx.beginPath();
    ctx.moveTo(W * 0.02, H * 0.62);
    ctx.quadraticCurveTo(W * 0.5, H * 0.05, W * 0.98, H * 0.62);
    ctx.lineTo(W * 0.98, H * 0.72);
    ctx.quadraticCurveTo(W * 0.5, H * 0.3, W * 0.02, H * 0.72);
    ctx.closePath(); ctx.fill();
    // 拱洞
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#7c8689';
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.68, W * 0.16, Math.PI, 0);
    ctx.closePath();
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fill(); ctx.restore();
    // 栏杆
    ctx.strokeStyle = '#7c8689'; ctx.lineWidth = W * 0.02;
    ctx.beginPath(); ctx.moveTo(W * 0.04, H * 0.34); ctx.quadraticCurveTo(W * 0.5, H * 0.1, W * 0.96, H * 0.34); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const bx = W * (0.06 + t * 0.88);
      const by = H * 0.34 - Math.sin(t * Math.PI) * H * 0.22;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - H * 0.1); ctx.stroke();
    }
    // 石缝
    ctx.strokeStyle = 'rgba(90,100,102,0.4)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      const bx = W * (0.05 + t * 0.9), by = H * 0.6 - Math.sin(t * Math.PI) * H * 0.24;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + W * 0.02, by + H * 0.16); ctx.stroke();
    }
  } },
  'spring-boat': { w: 0.95, h: 0.8, draw(ctx, W, H) {
    shOn(ctx, 5, 3, 'rgba(80,80,70,0.3)');
    ctx.fillStyle = '#8a6a4d';
    ctx.beginPath();
    ctx.moveTo(W * 0.06, H * 0.62); ctx.quadraticCurveTo(W * 0.5, H * 0.8, W * 0.94, H * 0.62);
    ctx.quadraticCurveTo(W * 0.5, H * 0.7, W * 0.06, H * 0.62);
    ctx.closePath(); ctx.fill(); shOff(ctx);
    // 篷
    ctx.fillStyle = '#5e6f80';
    ctx.beginPath(); ctx.arc(W * 0.42, H * 0.6, W * 0.22, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f9f5ea';
    ctx.beginPath(); ctx.arc(W * 0.42, H * 0.6, W * 0.17, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#8a6a4d'; ctx.lineWidth = W * 0.02;
    ctx.beginPath(); ctx.arc(W * 0.42, H * 0.6, W * 0.17, Math.PI, 0); ctx.stroke();
    // 船娘与橹
    ctx.fillStyle = '#3d4753';
    ctx.beginPath(); ctx.arc(W * 0.72, H * 0.48, W * 0.06, 0, 7); ctx.fill();
    ctx.fillStyle = '#2d5a8a';
    rr(ctx, W * 0.685, H * 0.52, W * 0.07, H * 0.14, W * 0.02); ctx.fill();
    ctx.strokeStyle = '#6d5138'; ctx.lineWidth = W * 0.025;
    ctx.beginPath(); ctx.moveTo(W * 0.75, H * 0.52); ctx.lineTo(W * 0.9, H * 0.78); ctx.stroke();
  } },
  'spring-lantern': { w: 0.42, h: 0.66, draw(ctx, W, H) {
    ctx.strokeStyle = '#6d5138'; ctx.lineWidth = W * 0.05;
    ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H * 0.12); ctx.stroke();
    const g = ctx.createRadialGradient(W * 0.4, H * 0.4, 2, W * 0.5, H * 0.45, W * 0.6);
    g.addColorStop(0, '#f2916b'); g.addColorStop(1, '#d95f4b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.45, W * 0.36, H * 0.3, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(140,50,40,0.55)'; ctx.lineWidth = 2;
    for (const rx of [0.55, 0.8]) {
      ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.45, W * 0.36 * rx, H * 0.3, 0, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#a8442e';
    ctx.fillRect(W * 0.38, H * 0.13, W * 0.24, H * 0.05);
    ctx.fillRect(W * 0.38, H * 0.72, W * 0.24, H * 0.05);
    ctx.strokeStyle = '#c4763a'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(W * (0.44 + i * 0.06), H * 0.77); ctx.lineTo(W * (0.44 + i * 0.06), H * 0.92); ctx.stroke();
    }
  } },
  'spring-sakura': { w: 2.1, h: 0.95, lean: true, draw(ctx, W, H) {
    pSakuraBranch(ctx, W * 0.05, H * 0.3, W * 0.5, H * 0.7);
    pSakuraBranch(ctx, W * 0.5, H * 0.42, W * 0.46, H * 0.62);
  } },
  // —— 夏 ——
  'summer-sky': { w: 4.6, h: 2.1, draw(ctx, W, H) {
    vgrad(ctx, 0, 0, W, H, '#d4f0f2', '#f9f7d8');
    pSun(ctx, W * 0.72, H * 0.32, H * 0.18, '#f9d96c');
    ctx.fillStyle = '#a8ccc9';
    ctx.beginPath(); ctx.ellipse(W * 0.16, H * 0.62, W * 0.16, H * 0.07, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#8fb8b5';
    ctx.beginPath(); ctx.ellipse(W * 0.16, H * 0.62, W * 0.16, H * 0.03, 0, Math.PI, 0); ctx.fill();
    pGull(ctx, W * 0.4, H * 0.2, H * 0.1);
    pGull(ctx, W * 0.52, H * 0.3, H * 0.07);
    pGull(ctx, W * 0.3, H * 0.36, H * 0.055);
  } },
  'summer-lighthouse': { w: 1.0, h: 1.95, draw(ctx, W, H) {
    pLighthouse(ctx, W * 0.5, H * 0.9, W * 0.86, H * 0.85);
  } },
  'summer-wave1': { w: 4.4, h: 0.7, draw(ctx, W, H) { pWave(ctx, 0, H * 0.18, W, H * 0.8, '#8fd2de', '#57b6c8'); } },
  'summer-wave2': { w: 4.5, h: 0.78, draw(ctx, W, H) { pWave(ctx, 0, H * 0.18, W, H * 0.8, '#5ebfd0', '#2f8aa2'); } },
  'summer-wave3': { w: 4.6, h: 0.85, draw(ctx, W, H) { pWave(ctx, 0, H * 0.18, W, H * 0.8, '#3f9fb5', '#1f6f8a'); } },
  'summer-boat': { w: 1.15, h: 1.3, draw(ctx, W, H) { pSailboat(ctx, W * 0.5, H * 0.88, W * 0.9, H * 0.85); } },
  // —— 秋 ——
  'autumn-peaks': { w: 2.6, h: 1.95, side: true, draw(ctx, W, H) {
    ctx.beginPath();
    ctx.moveTo(W * 0.02, H * 0.98);
    ctx.lineTo(W * 0.26, H * 0.3);
    ctx.lineTo(W * 0.44, H * 0.52);
    ctx.lineTo(W * 0.64, H * 0.16);
    ctx.lineTo(W * 0.88, H * 0.56);
    ctx.lineTo(W * 0.98, H * 0.98);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e0a34a'); g.addColorStop(0.5, '#c8773d'); g.addColorStop(1, '#8a4a2c');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(90,50,30,0.4)';
    ctx.beginPath();
    ctx.moveTo(W * 0.64, H * 0.16); ctx.lineTo(W * 0.88, H * 0.56); ctx.lineTo(W * 0.72, H * 0.98);
    ctx.lineTo(W * 0.58, H * 0.98); ctx.closePath(); ctx.fill();
    // 星与月
    ctx.fillStyle = 'rgba(255,240,220,0.9)';
    for (const [sx, sy] of [[0.2, 0.08], [0.35, 0.14], [0.5, 0.05], [0.75, 0.1], [0.9, 0.06]]) {
      ctx.beginPath(); ctx.arc(W * sx, H * sy, 3, 0, 7); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.16, H * 0.05, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(224,163,74,0.4)';
    ctx.beginPath(); ctx.arc(W * 0.8, H * 0.15, H * 0.05, 0, 7); ctx.fill();
    ctx.restore();
    // 山脚树
    pTreeA(ctx, W * 0.14, H * 0.97, H * 0.24, '#d07c35');
    pTreeA(ctx, W * 0.84, H * 0.97, H * 0.2, '#a8442e');
  } },
  'autumn-mist': { w: 4.2, h: 0.8, lean: true, draw(ctx, W, H) {
    pMist(ctx, W * 0.05, H * 0.4, W * 0.9, H * 0.5, 'rgba(255,244,228,0.8)');
    ctx.fillStyle = 'rgba(168,68,46,0.4)';
    for (const fx of [0.2, 0.45, 0.7]) pPine(ctx, W * fx, H * 0.55, H * 0.5, '#a8442e', 0);
  } },
  'autumn-treesL': { w: 1.7, h: 1.4, draw(ctx, W, H) {
    ctx.fillStyle = 'rgba(200,150,90,0.5)';
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.94, W * 0.45, H * 0.1, 0, 0, 7); ctx.fill();
    pTreeA(ctx, W * 0.26, H * 0.88, H * 0.75, '#d07c35');
    pTreeA(ctx, W * 0.6, H * 0.94, H * 0.95, '#a8442e');
    pTreeA(ctx, W * 0.85, H * 0.9, H * 0.6, '#e0a34a');
  } },
  'autumn-treesR': { w: 1.5, h: 1.3, draw(ctx, W, H) {
    ctx.fillStyle = 'rgba(200,150,90,0.5)';
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.94, W * 0.45, H * 0.1, 0, 0, 7); ctx.fill();
    pTreeA(ctx, W * 0.3, H * 0.92, H * 0.8, '#e0a34a');
    pTreeA(ctx, W * 0.68, H * 0.9, H * 0.95, '#c8662f');
  } },
  'autumn-tent': { w: 0.95, h: 0.85, draw(ctx, W, H) { pTent(ctx, W * 0.5, H * 0.92, W * 0.95, H * 0.85); } },
  'autumn-fire': { w: 0.6, h: 0.62, draw(ctx, W, H) { pFire(ctx, W * 0.5, H * 0.9, H * 0.85); } },
};

const artCache = new Map();
export function art(name, orient = 'up') {
  const key = name + '|' + orient;
  if (artCache.has(key)) return artCache.get(key);
  const def = artDefs[name];
  const S = 300; // px per world unit
  let defOrient = orient;
  if (def.lean && orient === 'up') defOrient = 'lean';
  const c = oriented(Math.round(def.w * S), Math.round(def.h * S), defOrient, def.draw);
  const t = toTex(c);
  artCache.set(key, t);
  return t;
}

// ============================================================
//  书页 / 封面 贴图
// ============================================================
export function pageTexture(chIdx, side) {
  const key = `page|${chIdx}|${side}`;
  if (artCache.has(key)) return artCache.get(key);
  const W = 1024, H = 1440;
  const ch = CHAPTERS[chIdx];
  const [c, ctx] = cv(W, H);
  vgrad(ctx, 0, 0, W, H, '#f8f2e2', '#f1e8d4');
  grain(ctx, W, H, 4200, 0.045);
  // 装订线阴影（画布左缘 = 书沟）
  const gg = ctx.createLinearGradient(0, 0, 170, 0);
  gg.addColorStop(0, 'rgba(90,70,50,0.30)'); gg.addColorStop(1, 'rgba(90,70,50,0)');
  ctx.fillStyle = gg; ctx.fillRect(0, 0, 170, H);
  // 前缘（画布右）细阴影
  const fg = ctx.createLinearGradient(W - 60, 0, W, 0);
  fg.addColorStop(0, 'rgba(90,70,50,0)'); fg.addColorStop(1, 'rgba(90,70,50,0.18)');
  ctx.fillStyle = fg; ctx.fillRect(W - 60, 0, 60, H);
  // 打印边框
  ctx.strokeStyle = 'rgba(100,85,65,0.4)'; ctx.lineWidth = 2.5;
  ctx.strokeRect(46, 42, W - 92, H - 84);
  ctx.strokeStyle = 'rgba(100,85,65,0.22)'; ctx.lineWidth = 1;
  ctx.strokeRect(58, 54, W - 116, H - 108);

  // —— 季节近景水洗色带（页面下部 = 靠近读者） ——
  ctx.save();
  ctx.globalAlpha = 0.55;
  if (ch.id === 'winter') {
    ctx.fillStyle = '#dfe6ec';
    ctx.fillRect(60, 1010, W - 190, 130);
    ctx.fillStyle = '#f4b94e';
    ctx.fillRect(60, 1000, W - 190, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath(); ctx.arc(60 + Math.random() * (W - 190), 1010 + Math.random() * 130, 2 + Math.random() * 3, 0, 7); ctx.fill();
    }
  } else if (ch.id === 'spring') {
    ctx.fillStyle = 'rgba(159,198,203,0.6)';
    ctx.fillRect(370, 200, 260, 1080);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 4;
    for (let y = 260; y < 1260; y += 90) {
      ctx.beginPath();
      ctx.moveTo(385, y);
      for (let x = 385; x < 615; x += 55) ctx.quadraticCurveTo(x + 27, y - 8, x + 55, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(143,106,77,0.5)';
    ctx.beginPath(); ctx.ellipse(500, 700, 62, 16, 0, 0, 7); ctx.fill();
  } else if (ch.id === 'summer') {
    ctx.fillStyle = 'rgba(242,226,186,0.8)';
    ctx.fillRect(60, 1080, W - 190, 240);
    ctx.fillStyle = 'rgba(214,186,132,0.8)';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath(); ctx.arc(60 + Math.random() * (W - 190), 1080 + Math.random() * 240, 2 + Math.random() * 2.5, 0, 7); ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(201,160,106,0.5)';
    ctx.beginPath();
    ctx.moveTo(60, H - 60); ctx.quadraticCurveTo(W * 0.45, 1210, W - 190, 1120);
    ctx.lineTo(W - 190, H - 60); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,55,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(80, H - 80); ctx.quadraticCurveTo(W * 0.45, 1230, W - 200, 1140); ctx.stroke();
  }
  ctx.restore();

  // 左页（日记区） / 右页（章节铭牌）
  if (side === 'left') {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(100,85,65,0.5)';
    ctx.font = font(26, 600, SANS);
    ctx.fillText('TRAVEL NOTES', 96, 128);
    ctx.font = font(20, 400, SANS);
    ctx.fillText(`VOL.0${chIdx + 1} · ${ch.dateShort}`, 96, 160);
    // 日记横线区
    ctx.fillStyle = 'rgba(100,85,65,0.65)';
    ctx.font = font(34, 400, HAND);
    ctx.fillText(ch.note.slice(0, 12), 100, 1000);
    ctx.fillText(ch.note.slice(12, 24), 100, 1056);
    ctx.strokeStyle = 'rgba(120,100,80,0.35)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const ly = 1112 + i * 62;
      ctx.beginPath(); ctx.moveTo(96, ly); ctx.lineTo(W - 130, ly); ctx.stroke();
    }
  } else {
    // 章节铭牌
    ctx.fillStyle = 'rgba(255,253,246,0.85)';
    rr(ctx, 640, 1120, 320, 230, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(100,85,65,0.45)'; ctx.lineWidth = 2;
    ctx.strokeRect(652, 1132, 296, 206);
    ctx.fillStyle = 'rgba(100,85,65,0.85)';
    ctx.textAlign = 'left';
    ctx.font = font(24, 600, SANS);
    ctx.fillText(`CHAPTER ${ch.no}`, 672, 1174);
    ctx.font = font(46, 400, HAND);
    ctx.fillStyle = '#4a4038';
    ctx.fillText(`${ch.season} · ${ch.title}`, 672, 1236);
    ctx.font = font(20, 400, SANS);
    ctx.fillStyle = 'rgba(100,85,65,0.9)';
    ctx.fillText(`${ch.city} · ${ch.date}`, 672, 1274);
    ctx.fillText(ch.weather, 672, 1304);
  }
  // 幽灵章节数字
  ctx.fillStyle = 'rgba(100,85,65,0.08)';
  ctx.font = font(400, 900, SANS);
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillText(ch.no, side === 'left' ? 80 : W - 80, 420);
  // 季节邮票
  stampDraw(ctx, side === 'left' ? 90 : W - 236, 84, 110, chIdx, [63, 80, 100, 120][chIdx]);
  if (side === 'left') postmarkDraw(ctx, 220, 160, 44, ch.city, ch.dateShort.slice(5));
  // 和纸胶带
  tapeDraw(ctx, 300, 30, 180, 44, -0.06, 'rgba(244,185,78,0.4)');
  tapeDraw(ctx, side === 'left' ? 700 : 200, 1372, 200, 46, 0.05, 'rgba(159,198,203,0.42)');
  // 装订线车缝线
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = 'rgba(100,85,65,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(24, 60); ctx.lineTo(24, H - 60); ctx.stroke();
  ctx.setLineDash([]);
  const t = toTex(c);
  artCache.set(key, t);
  return t;
}
function tapeDraw(ctx, x, y, w, h, rot, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(-w / 2 + Math.random() * w, -h / 2, 1.5, h);
  }
  ctx.restore();
}

export function coverTexture() {
  if (artCache.has('cover')) return artCache.get('cover');
  const W = 1024, H = 1440;
  const [c, ctx] = cv(W, H);
  // 深色亚麻
  vgrad(ctx, 0, 0, W, H, '#3d5a70', '#2b4254');
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#dfe8ee'; ctx.lineWidth = 1.5;
  for (let i = -H; i < W + H; i += 14) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  grain(ctx, W, H, 3200, 0.05);
  // 书脊（画布左 = 书沟侧）
  vgrad(ctx, 0, 0, 110, H, 'rgba(10,20,28,0.55)', 'rgba(10,20,28,0)');
  ctx.strokeStyle = 'rgba(226,214,188,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(24, 70); ctx.lineTo(24, H - 70); ctx.stroke();
  // 中央标签
  shOn(ctx, 14, 8, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = '#f6efdd';
  rr(ctx, 222, 240, 580, 830, 10); ctx.fill();
  shOff(ctx);
  ctx.strokeStyle = '#4a4038'; ctx.lineWidth = 3;
  rr(ctx, 248, 266, 528, 778, 6); ctx.stroke();
  ctx.lineWidth = 1.2;
  rr(ctx, 262, 280, 500, 750, 4); ctx.stroke();
  // 竖排书名
  ctx.fillStyle = '#3b3126';
  ctx.textAlign = 'center';
  const title = '四季旅行记忆';
  ctx.font = font(112, 400, HAND);
  [...title].forEach((chr, i) => {
    ctx.fillText(chr, 462, 442 + i * 122);
  });
  // 右侧竖排小字
  ctx.save();
  ctx.translate(590, 430);
  ctx.font = font(28, 600, SANS);
  ctx.fillStyle = '#5b5142';
  'POP-UP'.split('').forEach((chr, i) => ctx.fillText(chr, 0, i * 38));
  ctx.translate(40, 0);
  ctx.fillStyle = '#8a7a62';
  'ALBUM'.split('').forEach((chr, i) => ctx.fillText(chr, 0, i * 38));
  ctx.restore();
  // 四季印章（标签左列竖排）
  ctx.save();
  ctx.translate(294, 420);
  const seasons = ['冬', '春', '夏', '秋'];
  const cols = ['#5b7fae', '#d989a4', '#3d96a8', '#c4763a'];
  seasons.forEach((s, i) => {
    ctx.fillStyle = cols[i];
    ctx.beginPath(); ctx.arc(36, 38 + i * 122, 36, 0, 7); ctx.fill();
    ctx.fillStyle = '#fdfaf2';
    ctx.font = font(38, 400, HAND);
    ctx.fillText(s, 36, 52 + i * 122);
  });
  ctx.restore();
  // 标签底部小字
  ctx.fillStyle = '#5b5142';
  ctx.font = font(26, 400, SANS);
  ctx.fillText('立体旅行手帖 · 2024—2025', 512, 1006);
  ctx.font = font(18, 400, SANS);
  ctx.fillStyle = '#8a7a62';
  ctx.fillText('SIZI TRAVEL MEMORIES', 512, 1040);
  // 勒口磨损
  ctx.fillStyle = 'rgba(20,32,42,0.5)';
  rr(ctx, 866, 200, 44, 1040, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(240,232,210,0.35)'; ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath(); ctx.moveTo(888, 210); ctx.lineTo(888, 1230); ctx.stroke();
  ctx.setLineDash([]);
  const t = toTex(c);
  artCache.set('cover', t);
  return t;
}
export function coverInsideTexture() {
  if (artCache.has('coverIn')) return artCache.get('coverIn');
  const W = 1024, H = 1440;
  const [c, ctx] = cv(W, H);
  vgrad(ctx, 0, 0, W, H, '#f8f2e2', '#efe5cf');
  grain(ctx, W, H, 3600, 0.045);
  const gg = ctx.createLinearGradient(0, 0, 150, 0);
  gg.addColorStop(0, 'rgba(90,70,50,0.28)'); gg.addColorStop(1, 'rgba(90,70,50,0)');
  ctx.fillStyle = gg; ctx.fillRect(0, 0, 150, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a4038';
  ctx.font = font(52, 400, HAND);
  ctx.fillText('旅 行 路 线 图', W / 2, 150);
  ctx.font = font(22, 600, SANS);
  ctx.fillStyle = 'rgba(100,85,65,0.7)';
  ctx.fillText('R O U T E   M A P', W / 2, 192);
  // 路径
  const pts = [[200, 420], [780, 620], [240, 880], [800, 1120]];
  ctx.strokeStyle = '#b0623c'; ctx.lineWidth = 5;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  ctx.bezierCurveTo(560, 380, 560, 520, ...pts[1]);
  ctx.bezierCurveTo(460, 760, 460, 760, ...pts[2]);
  ctx.bezierCurveTo(560, 1000, 560, 1000, ...pts[3]);
  ctx.stroke();
  ctx.setLineDash([]);
  const cols = ['#5b7fae', '#d989a4', '#3d96a8', '#c4763a'];
  const legs = [['列车', pts[0], pts[1]], ['渡轮', pts[1], pts[2]], ['巴士', pts[2], pts[3]]];
  legs.forEach(([by, a, b]) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    ctx.fillStyle = '#8a6a4d';
    rr(ctx, mx - 44, my - 24, 88, 44, 8); ctx.fill();
    ctx.fillStyle = '#fdfaf2';
    ctx.font = font(24, 400, HAND);
    ctx.fillText(by, mx, my + 8);
  });
  ROUTE_STOP_DRAW: {
    const seasons = ['冬', '春', '夏', '秋'];
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = '#fdfaf2';
      ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.fill();
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, 44, 0, 7); ctx.stroke();
      ctx.fillStyle = cols[i];
      ctx.font = font(40, 400, HAND);
      ctx.fillText(seasons[i], x, y + 14);
      ctx.fillStyle = '#4a4038';
      ctx.font = font(30, 400, HAND);
      ctx.fillText(ROUTE_STOPS[i][0], x, y + 96);
      ctx.font = font(20, 400, SANS);
      ctx.fillStyle = 'rgba(100,85,65,0.8)';
      ctx.fillText(ROUTE_STOPS[i][1], x, y + 128);
    });
  }
  // 罗盘
  ctx.strokeStyle = 'rgba(100,85,65,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(860, 240, 50, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(860, 200); ctx.lineTo(872, 240); ctx.lineTo(860, 232); ctx.lineTo(848, 240); ctx.closePath();
  ctx.fillStyle = '#b0623c'; ctx.fill();
  ctx.fillStyle = 'rgba(100,85,65,0.8)';
  ctx.font = font(20, 600, SANS);
  ctx.fillText('N', 860, 188);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(100,85,65,0.7)';
  ctx.font = font(22, 400, SANS);
  ctx.fillText('· 2024.12 白泷町 → 2025.10 栎霜岭', 120, 1310);
  ctx.fillText('· 一册四页 · 四座小城 · 一整年', 120, 1348);
  const t = toTex(c);
  artCache.set('coverIn', t);
  return t;
}
const ROUTE_STOPS = [['白泷町', '2024.12'], ['杏花镇', '2025.03'], ['青屿岛', '2025.07'], ['栎霜岭', '2025.10']];

export function backCoverTexture() {
  if (artCache.has('backCover')) return artCache.get('backCover');
  const W = 1024, H = 1440;
  const [c, ctx] = cv(W, H);
  vgrad(ctx, 0, 0, W, H, '#b3986f', '#9c8258');
  grain(ctx, W, H, 5200, 0.07);
  ctx.strokeStyle = 'rgba(255,250,235,0.35)'; ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(80,60,40,0.7)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(W / 2, H - 320, 200, 110, 0, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(W / 2, H - 320, 180, 92, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(80,60,40,0.8)';
  ctx.font = font(44, 400, HAND);
  ctx.fillText('四季旅行記憶', W / 2, H - 336);
  ctx.font = font(24, 400, SANS);
  ctx.fillText('手帖製 · MMXXV', W / 2, H - 288);
  ctx.fillStyle = 'rgba(255,250,235,0.75)';
  ctx.font = font(26, 400, SANS);
  ctx.fillText('每一页都由纸张折叠而成', W / 2, H - 700);
  ctx.fillText('合上时，山与海回到平面', W / 2, H - 744);
  const t = toTex(c);
  artCache.set('backCover', t);
  return t;
}

// ============================================================
//  通用小贴图
// ============================================================
export function blobTexture() {
  if (artCache.has('blob')) return artCache.get('blob');
  const [c, ctx] = cv(256, 256);
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
  g.addColorStop(0, 'rgba(50,38,25,0.55)');
  g.addColorStop(0.6, 'rgba(50,38,25,0.22)');
  g.addColorStop(1, 'rgba(50,38,25,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = toTex(c); artCache.set('blob', t); return t;
}
const dotCache = new Map();
export function dotTexture(kind) {
  if (dotCache.has(kind)) return dotCache.get(kind);
  const [c, ctx] = cv(64, 64);
  if (kind === 'snow') {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 26);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 26, 0, 7); ctx.fill();
  } else if (kind === 'petal') {
    ctx.fillStyle = '#f3aec6';
    ctx.beginPath(); ctx.ellipse(32, 32, 12, 18, 0.5, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(28, 26, 5, 8, 0.5, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#d07c35';
    ctx.beginPath();
    ctx.moveTo(32, 6); ctx.quadraticCurveTo(58, 30, 32, 58); ctx.quadraticCurveTo(6, 30, 32, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,20,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(32, 52); ctx.stroke();
  }
  const t = toTex(c); dotCache.set(kind, t); return t;
}
export function puffTexture() {
  if (artCache.has('puff')) return artCache.get('puff');
  const [c, ctx] = cv(128, 128);
  for (const [x, y, r] of [[52, 72, 30], [76, 60, 26], [64, 46, 22]]) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  const t = toTex(c); artCache.set('puff', t); return t;
}
export function stackTexture() {
  if (artCache.has('stack')) return artCache.get('stack');
  const [c, ctx] = cv(512, 256);
  ctx.fillStyle = '#e9dfc8'; ctx.fillRect(0, 0, 512, 256);
  let y = 0;
  while (y < 256) {
    const h = 5 + Math.random() * 9;
    ctx.fillStyle = Math.random() > 0.5 ? '#f4edda' : '#d9ccb4';
    ctx.fillRect(0, y, 512, h);
    if (Math.random() > 0.88) { ctx.fillStyle = 'rgba(176,98,60,0.55)'; ctx.fillRect(0, y, 512, 2.5); }
    y += h;
  }
  grain(ctx, 512, 256, 800, 0.05);
  const t = toTex(c); artCache.set('stack', t); return t;
}
export function tableTexture() {
  if (artCache.has('table')) return artCache.get('table');
  const [c, ctx] = cv(1024, 1024);
  vgrad(ctx, 0, 0, 1024, 1024, '#cdb89a', '#b89d78');
  grain(ctx, 1024, 1024, 6000, 0.06);
  const g = ctx.createRadialGradient(512, 460, 120, 512, 512, 720);
  g.addColorStop(0, 'rgba(255,244,220,0.5)'); g.addColorStop(1, 'rgba(60,40,20,0.28)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
  const t = toTex(c); artCache.set('table', t); return t;
}

// 照片部件贴图（挂在书页上的拍立得等）
const photoTexCache = new Map();
export function photoTexture(pid) {
  if (photoTexCache.has(pid)) return photoTexCache.get(pid);
  const t = toTex(photoCanvas(pid));
  photoTexCache.set(pid, t);
  return t;
}
