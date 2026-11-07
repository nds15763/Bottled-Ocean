const W = 1600;
const H = 900;
const FRAME_MS = 1000 / 30;
const DPR_CAP = 1.5;
const FLAG_RECT = { x: 0.05025553662691652, y: 0.2729591836734694, w: 0.13798977853492334, h: 0.14795918367346939 };
const SUN_META = { x: 0.8024497637502654, y: 0.13257100349729242, pivotX: 0.5136544209031189, pivotY: 0.4735559566787003, widthRatio: 0.17941176470588235, heightRatio: 0.2799479166666667 };
const canvas = document.querySelector('#stage');
const backdrop = document.querySelector('#backdrop');
const ctx = canvas.getContext('2d', { alpha: true });
const bgCtx = backdrop.getContext('2d', { alpha: false });
const loading = document.querySelector('#loading');
const pauseButton = document.querySelector('#pause');
const params = new URLSearchParams(location.search);
const stillTime = params.has('t') ? Number(params.get('t')) : null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (params.has('clean')) {
  for (const selector of ['.hud', '#pause', '.hint']) {
    const element = document.querySelector(selector);
    if (element) element.style.display = 'none';
  }
}
const assetPaths = {
  background: './assets/background-clean.webp',
  boat: './assets/boat-base.webp',
  flagCloth: './assets/flag-cloth.webp',
  cloud: './assets/cloud.webp',
  cloudAlt: './assets/cloud-alt.webp',
  waves: './assets/waves.webp',
  sunDisk: './assets/sun-disk.webp',
  sunRays: './assets/sun-rays.webp',
};
const assets = {};
const cache = { clouds: [], waves: [] };
let viewWidth = 0;
let viewHeight = 0;
let simTime = stillTime ?? 0;
let lastFrame = 0;
let paused = stillTime !== null || reducedMotion;
let ready = false;
let dpr = 1;
let perfFrames = 0;
let perfTotalMs = 0;
let perfMaxMs = 0;

function makeCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

function scaled(image, width, height) {
  const c = makeCanvas(width, height);
  const cctx = c.getContext('2d');
  cctx.imageSmoothingEnabled = true;
  cctx.imageSmoothingQuality = 'high';
  cctx.drawImage(image, 0, 0, c.width, c.height);
  return c;
}

function loadImage(name, src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { assets[name] = image; resolve(image); };
    image.onerror = () => reject(new Error('素材加载失败: ' + src));
    image.src = src;
  });
}

function prepareCache() {
  cache.background = scaled(assets.background, W, H);
  const cloudDefs = [
    { x: 265, y: 150, w: 300, speed: 4.2, alpha: .96 },
    { x: 620, y: 225, w: 220, speed: 7.5, alpha: .88 },
    { x: 900, y: 180, w: 380, speed: 3.1, alpha: .94 },
    { x: 1390, y: 285, w: 205, speed: 9.5, alpha: .82 },
    { x: 30, y: 330, w: 185, speed: 8.2, alpha: .84 },
  ];
  cache.clouds = cloudDefs.map((c, index) => ({
    ...c,
    image: scaled(index % 2 ? assets.cloudAlt : assets.cloud, c.w, c.w * assets.cloud.height / assets.cloud.width),
  }));
  cache.puff = scaled(assets.cloud, 80, 80 * assets.cloud.height / assets.cloud.width);
  const waveDefs = [
    { w: 1500, y: .59, speed: 4, alpha: .22, squash: .45, phase: 0 },
    { w: 1200, y: .70, speed: 12, alpha: .25, squash: .65, phase: 1.4 },
    { w: 950, y: .84, speed: 24, alpha: .30, squash: .85, phase: 2.8 },
  ];
  cache.waves = waveDefs.map(w => ({
    ...w,
    image: scaled(assets.waves, w.w, w.w * assets.waves.height / assets.waves.width * w.squash),
  }));
  cache.boatWidth = Math.round(W * .265);
  cache.boatHeight = Math.round(cache.boatWidth * assets.boat.height / assets.boat.width);
  cache.boat = scaled(assets.boat, cache.boatWidth, cache.boatHeight);
  cache.flag = scaled(assets.flagCloth, cache.boatWidth * FLAG_RECT.w, cache.boatHeight * FLAG_RECT.h);
  cache.sunDisk = scaled(assets.sunDisk, W * SUN_META.widthRatio, H * SUN_META.heightRatio);
  cache.sunRays = scaled(assets.sunRays, W * SUN_META.widthRatio, H * SUN_META.heightRatio);
}

function applySceneTransform(targetCtx) {
  const scale = Math.max(viewWidth / W, viewHeight / H);
  const x = (viewWidth - W * scale) / 2;
  const y = viewWidth / viewHeight > W / H ? 0 : (viewHeight - H * scale) / 2;
  targetCtx.translate(x, y);
  targetCtx.scale(scale, scale);
  targetCtx.beginPath();
  targetCtx.rect(0, 0, W, H);
  targetCtx.clip();
}

function renderBackdrop() {
  bgCtx.save();
  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgCtx.fillStyle = '#173f5f';
  bgCtx.fillRect(0, 0, viewWidth, viewHeight);
  applySceneTransform(bgCtx);
  bgCtx.drawImage(cache.background, 0, 0);
  bgCtx.restore();
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  viewWidth = window.innerWidth;
  viewHeight = window.innerHeight;
  for (const c of [canvas, backdrop]) {
    c.width = Math.round(viewWidth * dpr);
    c.height = Math.round(viewHeight * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  if (ready) {
    renderBackdrop();
    draw(simTime);
  }
}

function drawClouds(time) {
  for (const c of cache.clouds) {
    const w = c.image.width;
    const cycle = W + w * 2;
    const x = ((c.x - time * c.speed + w) % cycle + cycle) % cycle - w;
    ctx.globalAlpha = c.alpha;
    ctx.drawImage(c.image, x, c.y);
  }
  ctx.globalAlpha = 1;
}

function drawSun(time) {
  const w = cache.sunDisk.width;
  const h = cache.sunDisk.height;
  const x = W * SUN_META.x;
  const y = H * SUN_META.y;
  const left = -SUN_META.pivotX * w;
  const top = -SUN_META.pivotY * h;
  ctx.save();
  ctx.translate(x, y);
  ctx.drawImage(cache.sunDisk, left, top);
  ctx.rotate(time * Math.PI * 2 / 45);
  ctx.drawImage(cache.sunRays, left, top);
  ctx.restore();
}

function drawMovingSea(time) {
  for (const band of cache.waves) {
    const w = band.image.width;
    const h = band.image.height;
    const offset = (time * band.speed) % w;
    const y = H * band.y + Math.sin(time * .65 + band.phase) * 1.5;
    ctx.globalAlpha = band.alpha;
    for (let x = -offset - w; x < W + w; x += w) {
      ctx.drawImage(band.image, x, y);
    }
  }
  ctx.globalAlpha = 1;
}

function drawSmoke(time, boatX, boatY, boatW, boatH) {
  for (let i = 0; i < 4; i++) {
    const age = (time * .22 + i * .25) % 1;
    const size = 18 + age * 38;
    const alpha = Math.max(0, (1 - age) * .65);
    const x = boatX + boatW * .02 - age * 58;
    const y = boatY - boatH * .93 - age * 95;
    ctx.globalAlpha = alpha;
    ctx.drawImage(cache.puff, x - size / 2, y - size / 2, size, size * cache.puff.height / cache.puff.width);
  }
  ctx.globalAlpha = 1;
}

function drawBoat(time) {
  const w = cache.boatWidth;
  const h = cache.boatHeight;
  const x = W * .46 + Math.sin(time * .18) * 18;
  const y = H * .79 + Math.sin(time * 1.35) * 4;
  const angle = Math.sin(time * 1.05) * .018;
  drawSmoke(time, x, y, w, h);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(cache.boat, -w / 2, -h);

  const flagW = cache.flag.width;
  const flagH = cache.flag.height;
  const originX = -w / 2 + FLAG_RECT.x * w;
  const originY = -h + FLAG_RECT.y * h;
  const slices = 7;
  const sourceW = cache.flag.width / slices;
  const destW = flagW / slices;
  for (let i = 0; i < slices; i++) {
    const n = (i + 1) / slices;
    const freedom = 1 - n;
    const dx = Math.sin(time * 2.8 + n * 2.4) * 5 * freedom;
    const dy = Math.sin(time * 3.2 + n * 3.6) * 3 * freedom;
    ctx.drawImage(
      cache.flag,
      i * sourceW, 0, sourceW + 1, cache.flag.height,
      originX + i * destW + dx, originY + dy, destW + 1, flagH
    );
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 246, 218, .58)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const dx = ((time * 24 + i * 63) % 250) - 125;
    ctx.beginPath();
    ctx.moveTo(x - w * .55 + dx, y + 4 + i * 3);
    ctx.quadraticCurveTo(x - w * .55 + dx + 14, y + i * 3, x - w * .55 + dx + 30, y + 4 + i * 3);
    ctx.stroke();
  }
  ctx.restore();
}

function recordDrawTime(start) {
  const ms = performance.now() - start;
  perfFrames++;
  if (perfFrames > 5) {
    perfTotalMs += ms;
    perfMaxMs = Math.max(perfMaxMs, ms);
  }
  if (perfFrames % 15 === 0) {
    canvas.dataset.drawMs = (perfTotalMs / Math.max(1, perfFrames - 5)).toFixed(2);
    canvas.dataset.frames = String(perfFrames);
    canvas.dataset.dpr = String(dpr);
  }
}

function draw(time) {
  if (!ready) return;
  const started = performance.now();
  ctx.save();
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  applySceneTransform(ctx);
  drawSun(time);
  drawClouds(time);
  drawMovingSea(time);
  drawBoat(time);
  ctx.restore();
  recordDrawTime(started);
}

function updatePauseUI() {
  pauseButton.textContent = paused ? '继续' : '暂停';
  pauseButton.setAttribute('aria-pressed', String(paused));
}

function togglePause() {
  if (stillTime !== null) return;
  paused = !paused;
  lastFrame = 0;
  updatePauseUI();
}

function frame(now) {
  if (!ready) return;
  requestAnimationFrame(frame);
  if (paused || document.hidden) { lastFrame = now; return; }
  if (lastFrame && now - lastFrame < FRAME_MS) return;
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .08) : 0;
  lastFrame = now;
  simTime += dt;
  draw(simTime);
}

async function start() {
  try {
    await Promise.all(Object.entries(assetPaths).map(([name, src]) => loadImage(name, src)));
    prepareCache();
    ready = true;
    resize();
    loading.classList.add('done');
    updatePauseUI();
    window.__SUNNY_DEMO_READY__ = true;
    window.__SUNNY_DEMO_RENDER_AT__ = (seconds) => { simTime = seconds; draw(seconds); };
    window.__SUNNY_DEMO_STATS__ = () => ({
      frames: perfFrames,
      averageDrawMs: perfTotalMs / Math.max(1, perfFrames - 5),
      maxDrawMs: perfMaxMs,
      dpr,
    });
    if (stillTime !== null) draw(stillTime);
    else requestAnimationFrame(frame);
  } catch (error) {
    loading.classList.add('error');
    loading.textContent = String(error.message || error);
    window.__SUNNY_DEMO_ERROR__ = String(error.message || error);
  }
}

pauseButton.addEventListener('click', togglePause);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
});
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { lastFrame = 0; });
resize();
start();
