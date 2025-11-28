const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let cw = canvas.width;
let ch = canvas.height;
function resize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  cw = canvas.width;
  ch = canvas.height;
  if (typeof window !== 'undefined' && window._game && window._game.generateBackground) window._game.generateBackground();
}
resize();
window.addEventListener('resize', resize);
const menuEl = document.getElementById('menu');
const hudEl = document.getElementById('hud');
const gameoverEl = document.getElementById('gameover');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const hpEl = document.getElementById('hp');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('finalScore');
const keys = new Set();
document.addEventListener('keydown', e => keys.add(e.code));
document.addEventListener('keyup', e => keys.delete(e.code));


const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');
const attackBtn = document.getElementById('attackBtn');

if (leftBtn) {
  leftBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.add('ArrowLeft'); }, { passive: false });
  leftBtn.addEventListener('touchend', e => { e.preventDefault(); keys.delete('ArrowLeft'); }, { passive: false });
  leftBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys.delete('ArrowLeft'); }, { passive: false });
}
if (rightBtn) {
  rightBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.add('ArrowRight'); }, { passive: false });
  rightBtn.addEventListener('touchend', e => { e.preventDefault(); keys.delete('ArrowRight'); }, { passive: false });
  rightBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys.delete('ArrowRight'); }, { passive: false });
}
if (jumpBtn) {
  jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.add('ArrowUp'); }, { passive: false });
  jumpBtn.addEventListener('touchend', e => { e.preventDefault(); keys.delete('ArrowUp'); }, { passive: false });
  jumpBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys.delete('ArrowUp'); }, { passive: false });
}
if (attackBtn) {
  attackBtn.addEventListener('touchstart', e => { e.preventDefault(); keys.add('KeyX'); }, { passive: false });
  attackBtn.addEventListener('touchend', e => { e.preventDefault(); keys.delete('KeyX'); }, { passive: false });
  attackBtn.addEventListener('touchcancel', e => { e.preventDefault(); keys.delete('KeyX'); }, { passive: false });
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return a + Math.random() * (b - a); }
function now() { return performance.now(); }
function rectsIntersect(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}
class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgm = null;
    this.muted = false;
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }
  startBgm() {
    if (!this.ctx) return;
    if (this.bgm) return;
    const o1 = this.ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = 196;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 261.63;
    const g = this.ctx.createGain();
    g.gain.value = 0.08;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    o1.connect(filter);
    o2.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    o1.start();
    o2.start();
    lfo.start();
    this.bgm = { o1, o2, g, lfo, filter };
  }
  stopBgm() {
    if (!this.bgm) return;
    const { o1, o2, lfo } = this.bgm;
    try { o1.stop(); o2.stop(); lfo.stop(); } catch (e) {}
    this.bgm = null;
  }
  playAttack() {
    if (!this.ctx) return;
    const src = this._noise(0.18);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start();
    src.stop(this.ctx.currentTime + 0.2);
  }
  playHit() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(320, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.15);
  }
  playDie() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90, this.ctx.currentTime);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.32);
  }
  playPlayerHurt() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(680, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(340, this.ctx.currentTime + 0.12);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600;
    bp.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.26, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    o.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }
  playMonsterSwing() {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(240, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.18);
  }
  toggleMute() {
    if (!this.ctx) return;
    this.muted = !this.muted;
    this.master.gain.value = this.muted ? 0 : 0.22;
  }
  _noise(duration) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }
  resume() { if (this.ctx) this.ctx.resume(); }
  suspend() { if (this.ctx) this.ctx.suspend(); }
}
class Player {
  constructor() {
    this.w = 40 * dpr;
    this.h = 70 * dpr;
    this.x = cw * 0.1;
    this.y = ch - this.h - 20 * dpr;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0.35 * dpr;
    this.jump = 10 * dpr;
    this.gravity = 0.5 * dpr;
    this.onGround = true;
    this.facing = 1;
    this.hp = 100;
    this.attackCooldown = 0;
    this.attacks = [];
    this.t = 0;
    this.attackPose = 0;
    this.particles = [];
    this.flash = 0;
    this.blood = [];
    this.splats = [];
    this.attackPhase = -1;
    this.attackTimer = 0;
  }
  update(dt) {
    const left = keys.has('ArrowLeft');
    const right = keys.has('ArrowRight');
    const up = keys.has('ArrowUp');
    const attack = keys.has('KeyX') || keys.has('Space');
    const f = dt / 16;
    this.vx = 0;
    if (left) { this.vx = -this.speed * dt; this.facing = -1; }
    if (right) { this.vx = this.speed * dt; this.facing = 1; }
    if (up && this.onGround) { this.vy = -this.jump; this.onGround = false; }
    this.x = clamp(this.x + this.vx, 0, cw - this.w);
    this.vy += this.gravity * f;
    this.y += this.vy * f;
    if (this.y >= ch - this.h - 20 * dpr) { this.y = ch - this.h - 20 * dpr; this.vy = 0; this.onGround = true; }
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.attackPose > 0) this.attackPose -= dt;
    if (this.attackPose < 0) this.attackPose = 0;
    if (attack && this.attackCooldown <= 0 && this.attackPhase === -1) {
      this.attackPhase = 0;
      this.attackTimer = 300;
      this.attackCooldown = 700;
      this.attackPose = 300;
    }
    if (this.attackPhase !== -1) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        if (this.attackPhase === 0) {
          const beamW = 160 * dpr;
          const beamH = 12 * dpr;
          const x = this.facing === 1 ? this.x + this.w*0.84 : this.x - beamW + this.w*0.16;
          const y = this.y + this.h * 0.42;
          this.attacks.push({ x, y, w: beamW, h: beamH, vx: this.facing * 0.85 * dpr, life: 280 });
          this.flash = 220;
          if (window._game && window._game.sound) window._game.sound.playAttack();
          for (let i=0;i<16;i++) {
            const px = x + rand(0, beamW*0.25);
            const py = y + rand(0, beamH);
            this.particles.push({ x: px, y: py, vx: this.facing * rand(0.25*dpr, 0.85*dpr), vy: rand(-0.22*dpr, 0.22*dpr), r: rand(1.2*dpr, 3.2*dpr), life: rand(120, 240), color: this.hp > 30 ? 'blue' : 'red' });
          }
          this.attackPhase = 1;
          this.attackTimer = 220;
          this.attackPose = 220;
        } else if (this.attackPhase === 1) {
          this.attackPhase = 2;
          this.attackTimer = 240;
          this.attackPose = 240;
        } else {
          this.attackPhase = -1;
          this.attackPose = 0;
        }
      }
    }
    for (const a of this.attacks) {
      a.x += a.vx * dt;
      a.life -= dt;
      if (Math.random() < 0.6) {
        const px = a.x + rand(a.w*0.2, a.w*0.8);
        const py = a.y + rand(0, a.h);
        this.particles.push({ x: px, y: py, vx: this.facing * rand(0.05*dpr, 0.25*dpr), vy: rand(-0.15*dpr, 0.15*dpr), r: rand(1.2*dpr, 2.6*dpr), life: rand(90, 160), color: this.hp > 30 ? 'blue' : 'red' });
      }
    }
    this.attacks = this.attacks.filter(a => a.life > 0 && a.x + a.w > 0 && a.x < cw);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0 && p.x > -20*dpr && p.x < cw + 20*dpr);
    const gy = ch - 20 * dpr;
    const nb = [];
    for (const b of this.blood) {
      b.vy += 0.07 * dpr * f;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      if (b.y >= gy) {
        const dir = b.vx >= 0 ? 1 : -1;
        this.emitSplat(b.x, gy, dir);
      } else {
        nb.push(b);
      }
    }
    this.blood = nb;
  }
  emitBlood(count, side) {
    for (let i=0;i<count;i++) {
      const ox = side < 0 ? this.x + this.w*0.4 : this.x + this.w*0.6;
      const oy = this.y + this.h*0.42 + rand(-this.h*0.06, this.h*0.06);
      const vx = side * rand(0.08*dpr, 0.42*dpr);
      const vy = -rand(0.12*dpr, 0.42*dpr);
      this.blood.push({ x: ox, y: oy, vx, vy, r: rand(1.4*dpr, 3.4*dpr), life: rand(420, 780), a: rand(0.6, 0.95) });
    }
  }
  emitSplat(x, y, dir) {
    const n = Math.floor(rand(4, 9));
    for (let i=0;i<n;i++) {
      const ang = dir * rand(-0.6, 0.6);
      const len = rand(6*dpr, 22*dpr);
      const w = rand(1.2*dpr, 2.6*dpr);
      const life = rand(900, 2000);
      this.splats.push({ x, y, ang, len, w, life });
    }
  }
  draw(ctx) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const wob = Math.sin(this.t * 0.01);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing, 1);
    ctx.translate(-this.w / 2, -this.h / 2);
    const prepP = this.attackPhase === 0 ? Math.max(0, Math.min(1, 1 - this.attackTimer / 300)) : 0;
    const relP = this.attackPhase === 1 ? Math.max(0, Math.min(1, 1 - this.attackTimer / 220)) : 0;
    const dip = relP * this.h * 0.02;
    ctx.translate(0, dip);
    const silver = '#cfd3da';
    const red = '#d03a33';
    const blue = '#50c2ff';
    const timerColor = this.hp > 30 ? blue : '#ff5050';
    const torsoG = ctx.createLinearGradient(this.w*0.25, this.h*0.25, this.w*0.75, this.h*0.7);
    torsoG.addColorStop(0, '#cfd3da');
    torsoG.addColorStop(1, '#aeb4bd');
    ctx.fillStyle = torsoG;
    ctx.fillRect(this.w*0.25, this.h*0.25, this.w*0.5, this.h*0.45);
    ctx.save();
    ctx.translate(this.w*0.5, this.h*0.12);
    ctx.rotate(-0.08 * prepP);
    ctx.fillStyle = silver;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.w*0.16, this.h*0.12, 0, 0, Math.PI*2);
    ctx.fill();
    const maskG = ctx.createLinearGradient(this.w*0.38, this.h*0.08, this.w*0.62, this.h*0.16);
    maskG.addColorStop(0, 'rgba(50,60,70,0.8)');
    maskG.addColorStop(1, 'rgba(20,25,30,0.8)');
    ctx.fillStyle = maskG;
    ctx.fillRect(this.w*0.38, this.h*0.08, this.w*0.24, this.h*0.08);
    ctx.fillStyle = '#fff6a0';
    ctx.beginPath();
    ctx.ellipse(-this.w*0.06, 0, this.w*0.035, this.h*0.03, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.w*0.06, 0, this.w*0.035, this.h*0.03, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = silver;
    ctx.beginPath();
    ctx.moveTo(this.w*0.5, this.h*0.0);
    ctx.lineTo(this.w*0.5, this.h*0.04);
    ctx.lineTo(this.w*0.47, this.h*0.08);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.w*0.65, this.h*0.06);
    ctx.lineTo(this.w*0.58, this.h*0.12);
    ctx.lineTo(this.w*0.68, this.h*0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.w*0.35, this.h*0.06);
    ctx.lineTo(this.w*0.42, this.h*0.12);
    ctx.lineTo(this.w*0.32, this.h*0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.moveTo(this.w*0.24, this.h*0.26);
    ctx.bezierCurveTo(this.w*0.34, this.h*0.20, this.w*0.45, this.h*0.18, this.w*0.50, this.h*0.23);
    ctx.bezierCurveTo(this.w*0.55, this.h*0.18, this.w*0.66, this.h*0.20, this.w*0.76, this.h*0.26);
    ctx.lineTo(this.w*0.76, this.h*0.34);
    ctx.bezierCurveTo(this.w*0.62, this.h*0.36, this.w*0.56, this.h*0.42, this.w*0.50, this.h*0.47);
    ctx.bezierCurveTo(this.w*0.44, this.h*0.42, this.w*0.38, this.h*0.36, this.w*0.24, this.h*0.34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.w*0.26, this.h*0.24);
    ctx.lineTo(this.w*0.30, this.h*0.22);
    ctx.lineTo(this.w*0.32, this.h*0.24);
    ctx.lineTo(this.w*0.28, this.h*0.26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.w*0.74, this.h*0.24);
    ctx.lineTo(this.w*0.70, this.h*0.22);
    ctx.lineTo(this.w*0.68, this.h*0.24);
    ctx.lineTo(this.w*0.72, this.h*0.26);
    ctx.closePath();
    ctx.fill();
    const pulse = this.hp > 30 ? 0.0 : (0.2 + 0.2*Math.sin(this.t*0.02));
    const r0 = this.w*0.06 * (1 + pulse);
    const rgTimer = ctx.createRadialGradient(this.w*0.5, this.h*0.43, 0, this.w*0.5, this.h*0.43, r0*1.2);
    rgTimer.addColorStop(0, timerColor);
    rgTimer.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = rgTimer;
    ctx.beginPath();
    ctx.arc(this.w*0.5, this.h*0.43, r0, 0, Math.PI*2);
    ctx.fill();
    if (this.attackPhase !== -1) {
      let la = -0.95;
      let ra = 0.95;
      if (this.attackPhase === 0) {
        const p = Math.max(0, Math.min(1, 1 - this.attackTimer / 300));
        la = -0.95 * p;
        ra = 0.95 * p;
      } else if (this.attackPhase === 2) {
        const p = Math.max(0, Math.min(1, 1 - this.attackTimer / 240));
        la = -0.95 * (1 - p);
        ra = 0.95 * (1 - p);
      }
      ctx.save();
      ctx.translate(this.w*0.5, this.h*0.42);
      ctx.rotate(la);
      ctx.fillStyle = silver;
      ctx.fillRect(-this.w*0.30, -this.h*0.05, this.w*0.36, this.h*0.12);
      ctx.fillStyle = red;
      ctx.fillRect(-this.w*0.28, -this.h*0.028, this.w*0.05, this.h*0.06);
      ctx.fillStyle = silver;
      ctx.beginPath();
      ctx.ellipse(-this.w*0.38, 0, this.w*0.065, this.h*0.09, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#b9c0c8';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(-this.w*0.396, -this.h*0.02);
      ctx.lineTo(-this.w*0.336, -this.h*0.02);
      ctx.moveTo(-this.w*0.396, 0);
      ctx.lineTo(-this.w*0.336, 0);
      ctx.moveTo(-this.w*0.396, this.h*0.02);
      ctx.lineTo(-this.w*0.336, this.h*0.02);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(this.w*0.5, this.h*0.42);
      ctx.rotate(ra);
      ctx.fillStyle = silver;
      ctx.fillRect(0, -this.h*0.05, this.w*0.36, this.h*0.12);
      ctx.fillStyle = red;
      ctx.fillRect(this.w*0.26, -this.h*0.028, this.w*0.05, this.h*0.06);
      ctx.fillStyle = silver;
      ctx.beginPath();
      ctx.ellipse(this.w*0.38, 0, this.w*0.065, this.h*0.09, 0, 0, Math.PI*2);
      ctx.fill();
      if (this.attackPhase === 1) {
        const ph = Math.max(0, Math.min(1, 1 - this.attackTimer / 220));
        const gg = ctx.createRadialGradient(this.w*0.38, 0, 0, this.w*0.38, 0, this.w*0.10);
        gg.addColorStop(0, 'rgba(255,255,255,0.95)');
        gg.addColorStop(1, 'rgba(80,194,255,0.0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(this.w*0.38, 0, this.w*0.085, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,194,255,0.9)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(this.w*0.33, -this.h*0.01);
        ctx.lineTo(this.w*0.36, -this.h*0.02);
        ctx.lineTo(this.w*0.40, 0);
        ctx.lineTo(this.w*0.36, this.h*0.02);
        ctx.lineTo(this.w*0.33, this.h*0.01);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.w*0.42, -this.h*0.01);
        ctx.lineTo(this.w*0.46, -this.h*0.015);
        ctx.lineTo(this.w*0.47, 0);
        ctx.lineTo(this.w*0.46, this.h*0.015);
        ctx.lineTo(this.w*0.42, this.h*0.01);
        ctx.stroke();
      }
      ctx.strokeStyle = '#b9c0c8';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(this.w*0.336, -this.h*0.02);
      ctx.lineTo(this.w*0.396, -this.h*0.02);
      ctx.moveTo(this.w*0.336, 0);
      ctx.lineTo(this.w*0.396, 0);
      ctx.moveTo(this.w*0.336, this.h*0.02);
      ctx.lineTo(this.w*0.396, this.h*0.02);
      ctx.stroke();
      ctx.restore();
      if (this.attackPhase === 1) {
        const ox = this.w*0.5;
        const oy = this.h*0.42;
        const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 18*dpr);
        rg.addColorStop(0, 'rgba(255,255,255,0.95)');
        rg.addColorStop(1, 'rgba(80,194,255,0.0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(ox, oy, 16*dpr, 0, Math.PI*2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = silver;
      ctx.save();
      ctx.translate(this.w*0.28, this.h*0.45);
      ctx.rotate(-0.6 + wob*0.05);
      ctx.fillRect(-this.w*0.06, -this.h*0.1, this.w*0.12, this.h*0.32);
      ctx.strokeStyle = '#b9c0c8';
      ctx.lineWidth = 1.2 * dpr;
      ctx.strokeRect(-this.w*0.06, -this.h*0.1, this.w*0.12, this.h*0.32);
      ctx.fillStyle = red;
      ctx.fillRect(-this.w*0.01, this.h*0.06, this.w*0.02, this.h*0.06);
      ctx.fillStyle = silver;
      ctx.beginPath();
      ctx.ellipse(this.w*0.06, this.h*0.18, this.w*0.055, this.h*0.08, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#b9c0c8';
      ctx.lineWidth = 1.8 * dpr;
      ctx.beginPath();
      ctx.moveTo(this.w*0.032, this.h*0.16);
      ctx.lineTo(this.w*0.098, this.h*0.16);
      ctx.moveTo(this.w*0.032, this.h*0.18);
      ctx.lineTo(this.w*0.098, this.h*0.18);
      ctx.moveTo(this.w*0.032, this.h*0.20);
      ctx.lineTo(this.w*0.098, this.h*0.20);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(this.w*0.72, this.h*0.45);
      ctx.rotate(0.6 - wob*0.05);
      ctx.fillRect(-this.w*0.06, -this.h*0.1, this.w*0.12, this.h*0.32);
      ctx.strokeStyle = '#b9c0c8';
      ctx.lineWidth = 1.2 * dpr;
      ctx.strokeRect(-this.w*0.06, -this.h*0.1, this.w*0.12, this.h*0.32);
      ctx.fillStyle = red;
      ctx.fillRect(-this.w*0.01, this.h*0.06, this.w*0.02, this.h*0.06);
      ctx.fillStyle = silver;
      ctx.beginPath();
      ctx.ellipse(this.w*0.06, this.h*0.18, this.w*0.055, this.h*0.08, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = '#b9c0c8';
      ctx.lineWidth = 1.8 * dpr;
      ctx.beginPath();
      ctx.moveTo(this.w*0.032, this.h*0.16);
      ctx.lineTo(this.w*0.098, this.h*0.16);
      ctx.moveTo(this.w*0.032, this.h*0.18);
      ctx.lineTo(this.w*0.098, this.h*0.18);
      ctx.moveTo(this.w*0.032, this.h*0.20);
      ctx.lineTo(this.w*0.098, this.h*0.20);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.moveTo(this.w*0.25, this.h*0.62);
    ctx.bezierCurveTo(this.w*0.38, this.h*0.60, this.w*0.62, this.h*0.60, this.w*0.75, this.h*0.62);
    ctx.lineTo(this.w*0.75, this.h*0.92);
    ctx.lineTo(this.w*0.25, this.h*0.92);
    ctx.closePath();
    ctx.fill();
    const legG = ctx.createLinearGradient(0, this.h*0.7, 0, this.h);
    legG.addColorStop(0, '#cfd3da');
    legG.addColorStop(1, '#9aa1a9');
    ctx.fillStyle = legG;
    ctx.fillRect(this.w*0.3, this.h*0.7, this.w*0.15, this.h*0.3);
    ctx.fillRect(this.w*0.55, this.h*0.7, this.w*0.15, this.h*0.3);
    ctx.fillStyle = red;
    ctx.fillRect(this.w*0.34, this.h*0.76, this.w*0.07, this.h*0.08);
    ctx.fillRect(this.w*0.59, this.h*0.76, this.w*0.07, this.h*0.08);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(this.w*0.25, this.h*0.25, this.w*0.5, this.h*0.45);
    ctx.restore();
    for (const a of this.attacks) {
      const core = this.hp > 30 ? '#9fe3ff' : '#ff9f9f';
      const glow = this.hp > 30 ? 'rgba(80,194,255,0.9)' : 'rgba(255,80,80,0.9)';
      const amp = 4 * dpr;
      const seg = 18;
      ctx.save();
      ctx.shadowBlur = 14 * dpr;
      ctx.shadowColor = glow;
      const g = ctx.createLinearGradient(a.x, a.y, a.x + a.w, a.y);
      g.addColorStop(0, glow);
      g.addColorStop(0.5, core);
      g.addColorStop(1, glow);
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let i=0;i<=seg;i++) {
        const t = i/seg;
        const x = a.x + t*a.w;
        const off = Math.sin(this.t*0.02 + i*0.7) * amp;
        const y = a.y - off;
        if (i===0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (let i=seg;i>=0;i--) {
        const t = i/seg;
        const x = a.x + t*a.w;
        const off = Math.sin(this.t*0.02 + i*0.7) * amp;
        const y = a.y + a.h + off;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      const cg = ctx.createLinearGradient(a.x, a.y, a.x + a.w, a.y);
      cg.addColorStop(0, 'rgba(255,255,255,0.0)');
      cg.addColorStop(0.5, 'rgba(255,255,255,0.85)');
      cg.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = cg;
      ctx.fillRect(a.x, a.y + a.h*0.25, a.w, a.h*0.5);
      const tip = ctx.createRadialGradient(a.x + a.w, a.y + a.h/2, 0, a.x + a.w, a.y + a.h/2, 18*dpr);
      tip.addColorStop(0, 'rgba(255,255,255,0.95)');
      tip.addColorStop(1, glow.replace('0.9','0.0'));
      ctx.fillStyle = tip;
      ctx.beginPath();
      ctx.arc(a.x + a.w, a.y + a.h/2, 16*dpr, 0, Math.PI*2);
      ctx.fill();
      if (this.flash > 0) {
        const s = Math.min(1, this.flash/160);
        const ox = this.facing === 1 ? this.x + this.w : this.x;
        const oy = this.y + this.h * 0.35 + a.h/2;
        const mg = ctx.createRadialGradient(ox, oy, 0, ox, oy, 22*dpr*s);
        mg.addColorStop(0, 'rgba(255,255,255,0.9)');
        mg.addColorStop(1, glow.replace('0.9','0.0'));
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(ox, oy, 20*dpr*s, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / 220));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color === 'blue' ? 'rgba(80,194,255,1)' : 'rgba(255,80,80,1)';
      ctx.beginPath();
      ctx.arc(p.x, p.y + this.h*0.02*Math.sin(this.t*0.02), p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const b of this.blood) {
      const a = Math.max(0, Math.min(1, b.a * (b.life / 780)));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#c81f3d';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const s of this.splats) {
      const a = Math.max(0, Math.min(1, s.life / 2000));
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.ang);
      ctx.fillStyle = '#8e0d24';
      ctx.fillRect(0, 0, s.len, s.w);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}
class Monster {
  constructor(level) {
    this.w = rand(40, 70) * dpr;
    this.h = rand(40, 70) * dpr;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.x = side < 0 ? -this.w - 20 * dpr : cw + 20 * dpr;
    this.y = ch - this.h - rand(20, 40) * dpr;
    this.vx = side < 0 ? rand(0.08, 0.22) * dpr : -rand(0.08, 0.22) * dpr;
    this.hp = Math.round(rand(1, 3) + level * 0.3);
    this.dead = false;
    const r = Math.random();
    this.type = r < 0.18 ? 'baltan' : r < 0.36 ? 'gomora' : r < 0.54 ? 'zetton' : r < 0.72 ? 'eleking' : r < 0.9 ? 'kingjoe' : 'redking';
    this.t = 0;
    this.hurt = 0;
    this.weaponType = Math.random() < 0.5 ? 'club' : 'knife';
    this.attackPose = 0;
    this.attackCooldown = rand(900, 1600);
    this.weaponAngle = 0;
    const speedScale = this.type === 'baltan' ? 1 : this.type === 'gomora' ? 0.65 : this.type === 'zetton' ? 0.6 : this.type === 'eleking' ? 0.55 : this.type === 'kingjoe' ? 0.55 : 0.5;
    this.vx *= speedScale;
    const hpScale = this.type === 'baltan' ? 3 : this.type === 'gomora' ? 4 : this.type === 'zetton' ? 5 : this.type === 'eleking' ? 3 : this.type === 'kingjoe' ? 5 : 4;
    this.hp = Math.max(1, Math.round(this.hp * hpScale));
  }
  bbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt) {
    this.t += dt;
    this.x += this.vx * dt;
    if (this.type === 'baltan') this.y += Math.sin(this.t * 0.006) * 0.22 * dpr * (dt / 16);
    if (this.type === 'eleking') this.y += Math.sin(this.t * 0.008) * 0.18 * dpr * (dt / 16);
    if (this.hurt > 0) this.hurt -= dt;
    if (this.hurt < 0) this.hurt = 0;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    const facing = this.vx >= 0 ? 1 : -1;
    const swingDur = 380;
    if (this.attackPose > 0) {
      const p = Math.max(0, Math.min(1, 1 - this.attackPose / swingDur));
      this.weaponAngle = facing * (-0.9 + p * 1.8);
      this.attackPose -= dt;
      if (this.attackPose < 0) this.attackPose = 0;
    } else {
      this.weaponAngle = facing * (-0.2 + Math.sin(this.t * 0.004) * 0.06);
    }
  }
  weaponPivot() {
    const facing = this.vx >= 0 ? 1 : -1;
    const px = facing === 1 ? this.w * 0.78 : this.w * 0.22;
    const py = this.h * 0.38;
    return { px, py, facing };
  }
  weaponHitbox() {
    const { px, py } = this.weaponPivot();
    const len = this.h * 0.6;
    const th = this.weaponType === 'knife' ? this.w * 0.06 : this.w * 0.1;
    const ex = px + Math.cos(this.weaponAngle) * len;
    const ey = py + Math.sin(this.weaponAngle) * len;
    const minx = Math.min(px, ex) - th / 2;
    const miny = Math.min(py, ey) - th / 2;
    const maxx = Math.max(px, ex) + th / 2;
    const maxy = Math.max(py, ey) + th / 2;
    return { x: this.x + minx, y: this.y + miny, w: maxx - minx, h: maxy - miny };
  }
  startAttack() {
    const swingDur = 380;
    this.attackPose = swingDur;
    this.attackCooldown = rand(1200, 2000);
    if (window._game && window._game.sound) window._game.sound.playMonsterSwing();
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'baltan') {
      ctx.fillStyle = '#6aa7d9';
      ctx.fillRect(this.w*0.22, this.h*0.2, this.w*0.56, this.h*0.6);
      ctx.fillStyle = '#3d6ba3';
      ctx.fillRect(this.w*0.22, this.h*0.58, this.w*0.56, this.h*0.22);
      ctx.fillStyle = '#e9d362';
      ctx.beginPath();
      ctx.ellipse(this.w*0.4, this.h*0.28, this.w*0.06, this.h*0.05, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.w*0.6, this.h*0.28, this.w*0.06, this.h*0.05, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.save();
      ctx.translate(this.w*0.16, this.h*0.42);
      ctx.rotate(-0.75);
      ctx.fillStyle = '#6aa7d9';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w*0.14, this.h*0.22, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(this.w*0.84, this.h*0.42);
      ctx.rotate(0.75);
      ctx.fillStyle = '#6aa7d9';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.w*0.14, this.h*0.22, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    } else if (this.type === 'gomora') {
      ctx.fillStyle = '#7a4f2a';
      ctx.beginPath();
      ctx.roundRect(this.w*0.18, this.h*0.18, this.w*0.64, this.h*0.64, this.w*0.1);
      ctx.fill();
      ctx.fillStyle = '#5b3a1f';
      for (let i=0;i<5;i++) {
        const bx = this.w*0.24 + i*this.w*0.1;
        const by = this.h*0.18 - i*this.h*0.05;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + this.w*0.08, by + this.h*0.1);
        ctx.lineTo(bx - this.w*0.02, by + this.h*0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#7a4f2a';
      ctx.beginPath();
      ctx.moveTo(this.w*0.3, this.h*0.18);
      ctx.lineTo(this.w*0.38, this.h*0.24);
      ctx.lineTo(this.w*0.36, this.h*0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a4f2a';
      ctx.fillRect(-this.w*0.18, this.h*0.52, this.w*0.3, this.h*0.1);
    } else if (this.type === 'zetton') {
      ctx.fillStyle = '#161616';
      ctx.fillRect(this.w*0.22, this.h*0.18, this.w*0.56, this.h*0.64);
      ctx.fillStyle = '#f7a21f';
      ctx.beginPath();
      ctx.moveTo(this.w*0.5, this.h*0.44);
      ctx.lineTo(this.w*0.64, this.h*0.5);
      ctx.lineTo(this.w*0.5, this.h*0.62);
      ctx.lineTo(this.w*0.36, this.h*0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd25c';
      ctx.beginPath();
      ctx.moveTo(this.w*0.5, this.h*0.47);
      ctx.lineTo(this.w*0.58, this.h*0.5);
      ctx.lineTo(this.w*0.5, this.h*0.57);
      ctx.lineTo(this.w*0.42, this.h*0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(this.w*0.3, this.h*0.02);
      ctx.lineTo(this.w*0.38, this.h*0.2);
      ctx.lineTo(this.w*0.22, this.h*0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.w*0.7, this.h*0.02);
      ctx.lineTo(this.w*0.62, this.h*0.2);
      ctx.lineTo(this.w*0.78, this.h*0.2);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'eleking') {
      ctx.fillStyle = '#eaeaea';
      ctx.fillRect(this.w*0.22, this.h*0.2, this.w*0.56, this.h*0.6);
      ctx.fillStyle = '#2b2b2b';
      for (let i=0;i<6;i++) {
        const px = this.w*0.22 + Math.random()*this.w*0.56;
        const py = this.h*0.2 + Math.random()*this.h*0.6;
        ctx.fillRect(px, py, this.w*0.08, this.h*0.04);
      }
      ctx.fillStyle = '#eaeaea';
      ctx.beginPath();
      ctx.moveTo(this.w*0.5, this.h*0.08);
      ctx.lineTo(this.w*0.58, this.h*0.16);
      ctx.lineTo(this.w*0.42, this.h*0.16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#eaeaea';
      ctx.lineWidth = 6 * dpr;
      ctx.beginPath();
      const ty = this.h*0.7;
      ctx.moveTo(this.w*0.80, ty);
      for (let i=0;i<10;i++) {
        const tx = this.w*0.80 + i*this.w*0.10;
        const off = Math.sin((this.t*0.004)+i)*this.h*0.09;
        ctx.lineTo(tx, ty+off);
      }
      ctx.lineTo(this.w*1.25, ty + Math.sin((this.t*0.004)+10)*this.h*0.09);
      ctx.stroke();
    } else if (this.type === 'kingjoe') {
      ctx.fillStyle = '#bdbdbd';
      ctx.fillRect(this.w*0.25, this.h*0.18, this.w*0.5, this.h*0.64);
      ctx.fillStyle = '#8c8c8c';
      for (let i=0;i<4;i++) {
        ctx.fillRect(this.w*0.25+i*this.w*0.125, this.h*0.18, this.w*0.02, this.h*0.64);
      }
      ctx.fillStyle = '#dddddd';
      ctx.beginPath();
      ctx.arc(this.w*0.38, this.h*0.3, this.w*0.03, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.w*0.62, this.h*0.3, this.w*0.03, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#d9c2a6';
      ctx.beginPath();
      ctx.roundRect(this.w*0.2, this.h*0.18, this.w*0.6, this.h*0.66, this.w*0.1);
      ctx.fill();
      ctx.fillStyle = '#c7af92';
      for (let i=0;i<6;i++) {
        const bx = this.w*0.22 + i*this.w*0.09;
        const by = this.h*0.24 + i*this.h*0.06;
        ctx.beginPath();
        ctx.arc(bx, by, this.w*0.05, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle = '#b35b5b';
      ctx.beginPath();
      ctx.arc(this.w*0.5, this.h*0.48, this.w*0.08, 0, Math.PI*2);
      ctx.fill();
    }
    {
      const { px, py } = this.weaponPivot();
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(this.weaponAngle);
      if (this.weaponType === 'knife') {
        ctx.fillStyle = '#cfd3da';
        ctx.fillRect(0, -this.w*0.03, this.h*0.5, this.w*0.06);
        ctx.fillStyle = '#b21e2f';
        ctx.beginPath();
        ctx.moveTo(this.h*0.5, -this.w*0.03);
        ctx.lineTo(this.h*0.62, 0);
        ctx.lineTo(this.h*0.5, this.w*0.03);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#7a4f2a';
        ctx.fillRect(-this.w*0.06, -this.w*0.04, this.w*0.12, this.w*0.08);
      } else {
        ctx.fillStyle = '#7a4f2a';
        ctx.beginPath();
        ctx.roundRect(0, -this.w*0.05, this.h*0.45, this.w*0.1, this.w*0.05);
        ctx.fill();
        ctx.fillStyle = '#5b3a1f';
        ctx.beginPath();
        ctx.arc(this.h*0.45, 0, this.w*0.07, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#7a4f2a';
        ctx.fillRect(-this.w*0.06, -this.w*0.04, this.w*0.12, this.w*0.08);
      }
      ctx.restore();
    }
    if (this.hurt > 0) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-this.w*0.1, -this.h*0.1, this.w*1.2, this.h*1.2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
class Game {
  constructor() {
    this.state = 'menu';
    this.player = new Player();
    this.monsters = [];
    this.score = 0;
    this.level = 1;
    this.spawnTimer = 0;
    this.lastTime = now();
    this.bg = { stars: [], buildings: [], mountainsFar: [], mountainsNear: [], clouds: [] };
    this.bgTime = 0;
    this.generateBackground();
    this.sound = new Sound();
    this.sfxHitCooldown = 0;
    this.sfxPlayerHurtCooldown = 0;
    this.vignette = 0;
  }
  start() {
    this.state = 'playing';
    menuEl.classList.add('hidden');
    gameoverEl.classList.add('hidden');
    hudEl.style.display = 'flex';
    this.player = new Player();
    this.monsters = [];
    this.score = 0;
    this.level = 1;
    this.spawnTimer = 0;
    this.lastTime = now();
    this.generateBackground();
    this.sound.init();
    this.sound.resume();
    this.sound.startBgm();
    this.sfxHitCooldown = 0;
    this.sfxPlayerHurtCooldown = 0;
  }
  pauseToggle() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
  }
  resume() {
    if (this.state === 'paused') { this.state = 'playing'; this.lastTime = now(); }
  }
  gameOver() {
    this.state = 'over';
    finalScoreEl.textContent = this.score.toString();
    gameoverEl.classList.remove('hidden');
    if (this.sound) { this.sound.playDie(); this.sound.stopBgm(); }
  }
  spawn(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.monsters.push(new Monster(this.level));
      const base = 1600 - this.level * 60;
      this.spawnTimer = clamp(base, 600, 1600);
    }
  }
  update(dt) {
    if (this.state !== 'playing') return;
    this.player.update(dt);
    for (const m of this.monsters) m.update(dt);
    this.monsters = this.monsters.filter(m => m.x + m.w > -50 * dpr && m.x < cw + 50 * dpr && !m.dead);
    for (const a of this.player.attacks) {
      for (const m of this.monsters) {
        if (rectsIntersect({ x: a.x, y: a.y, w: a.w, h: a.h }, m.bbox())) {
          m.hp -= 1;
          m.hurt = 160;
          if (this.sfxHitCooldown <= 0 && this.sound) { this.sound.playHit(); this.sfxHitCooldown = 120; }
          if (m.hp <= 0 && !m.dead) { m.dead = true; if (this.sound) this.sound.playDie(); this.score += 10; if (this.score % 100 === 0) this.level += 1; }
        }
      }
    }
    const pb = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
    for (const m of this.monsters) {
      if (rectsIntersect(pb, m.bbox())) {
        this.player.hp -= 0.1 * dpr;
        if (this.sfxPlayerHurtCooldown <= 0 && this.sound) { this.sound.playPlayerHurt(); this.sfxPlayerHurtCooldown = 260; }
        if (this.sfxPlayerHurtCooldown <= 0) {
          const side = (this.player.x + this.player.w/2) - (m.x + m.w/2) > 0 ? -1 : 1;
          this.player.emitBlood(16, side);
        }
        this.vignette = Math.min(320, this.vignette + 160);
      }
      const mdx = Math.abs((m.x + m.w/2) - (this.player.x + this.player.w/2));
      const mdy = Math.abs((m.y + m.h/2) - (this.player.y + this.player.h/2));
      if (m.attackCooldown <= 0 && mdx < 80 * dpr && mdy < 60 * dpr) m.startAttack();
      if (m.attackPose > 0) {
        const wb = m.weaponHitbox();
        if (rectsIntersect(pb, wb)) {
          this.player.hp -= 0.35 * dpr;
          if (this.sfxPlayerHurtCooldown <= 0 && this.sound) { this.sound.playPlayerHurt(); this.sfxPlayerHurtCooldown = 220; }
          const side = (this.player.x + this.player.w/2) - (m.x + m.w/2) > 0 ? -1 : 1;
          this.player.emitBlood(12, side);
          this.vignette = Math.min(320, this.vignette + 160);
        }
      }
    }
    if (this.player.hp <= 0) this.gameOver();
    this.spawn(dt);
    if (this.sfxHitCooldown > 0) this.sfxHitCooldown -= dt;
    if (this.sfxPlayerHurtCooldown > 0) this.sfxPlayerHurtCooldown -= dt;
    this.updateBackground(dt);
    if (this.vignette > 0) this.vignette -= dt;
    hpEl.textContent = Math.max(0, Math.round(this.player.hp)).toString();
    scoreEl.textContent = this.score.toString();
    levelEl.textContent = this.level.toString();
  }
  generateBackground() {
    this.bg.stars = [];
    const sc = 120;
    for (let i=0;i<sc;i++) {
      this.bg.stars.push({ x: rand(0, cw), y: rand(0, ch*0.5), r: rand(0.8*dpr, 1.8*dpr), a: rand(0.4, 0.9) });
    }
    this.bg.mountainsFar = [];
    const stepF = cw/8;
    for (let i=0;i<=8;i++) {
      const x = i*stepF;
      const y = ch*0.6 - rand(ch*0.08, ch*0.16);
      this.bg.mountainsFar.push({x,y});
    }
    this.bg.mountainsNear = [];
    const stepN = cw/7;
    for (let i=0;i<=7;i++) {
      const x = i*stepN;
      const y = ch*0.72 - rand(ch*0.12, ch*0.2);
      this.bg.mountainsNear.push({x,y});
    }
    this.bg.buildings = [];
    let bx = 0;
    while (bx < cw) {
      const bw = rand(60*dpr, 120*dpr);
      const bh = rand(ch*0.25, ch*0.45);
      const cols = Math.max(3, Math.floor(bw/(14*dpr)));
      const rows = Math.max(4, Math.floor(bh/(18*dpr)));
      const win = [];
      for (let r=0;r<rows;r++) {
        for (let c=0;c<cols;c++) win.push(Math.random() < 0.35);
      }
      this.bg.buildings.push({ x: bx, w: bw, h: bh, cols, rows, windows: win });
      bx += bw + rand(12*dpr, 28*dpr);
    }
    this.bg.clouds = [];
    const cc = 6;
    for (let i=0;i<cc;i++) {
      this.bg.clouds.push({ x: rand(-cw*0.2, cw), y: rand(ch*0.06, ch*0.22), w: rand(120*dpr, 220*dpr), h: rand(40*dpr, 80*dpr), speed: rand(0.02*dpr, 0.06*dpr) });
    }
  }
  updateBackground(dt) {
    const f = dt/16;
    for (const c of this.bg.clouds) {
      c.x += c.speed * f * 60;
      if (c.x > cw + 140*dpr) c.x = -200*dpr;
    }
    this.bgTime += dt;
  }
  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#0b132b');
    g.addColorStop(0.5, '#142033');
    g.addColorStop(1, '#1b263b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    const rg = ctx.createRadialGradient(cw*0.85, ch*0.13, 0, cw*0.85, ch*0.13, ch*0.18);
    rg.addColorStop(0, 'rgba(255,235,165,0.9)');
    rg.addColorStop(1, 'rgba(255,235,165,0.0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cw*0.85, ch*0.13, ch*0.12, 0, Math.PI*2);
    ctx.fill();
    for (const s of this.bg.stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0e1726';
    ctx.beginPath();
    ctx.moveTo(0, ch);
    for (let i=0;i<this.bg.mountainsFar.length;i++) {
      const p = this.bg.mountainsFar[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(cw, ch);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#12243a';
    ctx.beginPath();
    ctx.moveTo(0, ch);
    for (let i=0;i<this.bg.mountainsNear.length;i++) {
      const p = this.bg.mountainsNear[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(cw, ch);
    ctx.closePath();
    ctx.fill();
    for (const b of this.bg.buildings) {
      const by = ch - 20*dpr - b.h;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(b.x, by, b.w, b.h);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(b.x, by + b.h*0.8, b.w, b.h*0.2);
      const padX = 6*dpr;
      const padY = 8*dpr;
      const cellW = (b.w - padX*2) / b.cols;
      const cellH = (b.h*0.8 - padY*2) / b.rows;
      for (let r=0;r<b.rows;r++) {
        for (let c=0;c<b.cols;c++) {
          const i = r*b.cols + c;
          if (!b.windows[i]) continue;
          const wx = b.x + padX + c*cellW + cellW*0.2;
          const wy = by + padY + r*cellH + cellH*0.2;
          const ww = cellW*0.6;
          const wh = cellH*0.6;
          ctx.fillStyle = 'rgba(255,222,150,0.8)';
          ctx.fillRect(wx, wy, ww, wh);
        }
      }
    }
    for (const c of this.bg.clouds) {
      ctx.fillStyle = 'rgba(200,210,220,0.75)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.h*0.35, 0, Math.PI*2);
      ctx.arc(c.x + c.w*0.25, c.y + c.h*0.05, c.h*0.4, 0, Math.PI*2);
      ctx.arc(c.x + c.w*0.5, c.y, c.h*0.33, 0, Math.PI*2);
      ctx.arc(c.x + c.w*0.7, c.y + c.h*0.06, c.h*0.28, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, ch - 20 * dpr, cw, 20 * dpr);
  }
  draw(ctx) {
    this.drawBackground(ctx);
    this.player.draw(ctx);
    for (const m of this.monsters) m.draw(ctx);
    if (this.vignette > 0) {
      const s = Math.max(0, Math.min(1, this.vignette / 320));
      const edge = 80 * dpr;
      const topG = ctx.createLinearGradient(0, 0, 0, edge);
      topG.addColorStop(0, `rgba(200,30,60,${0.55*s})`);
      topG.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, cw, edge);
      const botG = ctx.createLinearGradient(0, ch, 0, ch - edge);
      botG.addColorStop(0, `rgba(200,30,60,${0.45*s})`);
      botG.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = botG;
      ctx.fillRect(0, ch - edge, cw, edge);
      const leftG = ctx.createLinearGradient(0, 0, edge, 0);
      leftG.addColorStop(0, `rgba(200,30,60,${0.55*s})`);
      leftG.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = leftG;
      ctx.fillRect(0, 0, edge, ch);
      const rightG = ctx.createLinearGradient(cw, 0, cw - edge, 0);
      rightG.addColorStop(0, `rgba(200,30,60,${0.55*s})`);
      rightG.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = rightG;
      ctx.fillRect(cw - edge, 0, edge, ch);
      const r = ch * 0.25;
      const c1 = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      c1.addColorStop(0, `rgba(200,30,60,${0.38*s})`);
      c1.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.fill();
      const c2 = ctx.createRadialGradient(cw, 0, 0, cw, 0, r);
      c2.addColorStop(0, `rgba(200,30,60,${0.38*s})`);
      c2.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.arc(cw, 0, r, 0, Math.PI*2);
      ctx.fill();
      const c3 = ctx.createRadialGradient(0, ch, 0, 0, ch, r);
      c3.addColorStop(0, `rgba(200,30,60,${0.38*s})`);
      c3.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = c3;
      ctx.beginPath();
      ctx.arc(0, ch, r, 0, Math.PI*2);
      ctx.fill();
      const c4 = ctx.createRadialGradient(cw, ch, 0, cw, ch, r);
      c4.addColorStop(0, `rgba(200,30,60,${0.38*s})`);
      c4.addColorStop(1, 'rgba(200,30,60,0)');
      ctx.fillStyle = c4;
      ctx.beginPath();
      ctx.arc(cw, ch, r, 0, Math.PI*2);
      ctx.fill();
    }
    if (this.state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#e6edf7';
      ctx.font = `${24*dpr}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('已暂停，按 P 继续', cw/2, ch/2);
    }
  }
}
const game = new Game();
window._game = game;
function loop() {
  const t = now();
  const dt = clamp(t - game.lastTime, 0, 60);
  game.lastTime = t;
  if (keys.has('KeyP')) { keys.delete('KeyP'); if (game.state === 'playing') game.pauseToggle(); else game.resume(); }
  if (keys.has('KeyM')) { keys.delete('KeyM'); if (game.sound) game.sound.toggleMute(); }
  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(loop);
}
startBtn.addEventListener('click', () => { game.start(); });
restartBtn.addEventListener('click', () => { game.start(); });
requestAnimationFrame(loop);