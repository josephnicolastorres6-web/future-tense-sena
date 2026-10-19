/* =====================================================================
   confetti.js — Lightweight canvas confetti (no external library)
   API: Confetti.burst({x, y, count, angle, spread, speed})
        Confetti.cannons()   Confetti.rain(ms)
   x / y are ratios of the viewport (0 → 1).
   ===================================================================== */
const Confetti = (() => {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '100',
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const COLORS = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#ffd400', '#ffffff', '#f472b6', '#22d3ee', '#a855f7'];
  let W = 0, H = 0;
  let parts = [];
  let running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function make(x, y, angle, spread, speed) {
    const a = (angle + (Math.random() - 0.5) * spread) * Math.PI / 180;
    const s = speed * (0.45 + Math.random() * 0.75);
    const r = Math.random();
    return {
      x, y,
      vx: Math.cos(a) * s,
      vy: -Math.sin(a) * s,
      w: 7 + Math.random() * 7,
      h: 9 + Math.random() * 9,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 16,
      tilt: Math.random() * Math.PI * 2,
      vt: 0.05 + Math.random() * 0.12,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: r < 0.22 ? 'circle' : r < 0.34 ? 'tri' : 'rect',
      life: 0,
      max: 520 + Math.random() * 120,
    };
  }

  function loop() {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.life < p.max && p.y < H + 40);
    for (const p of parts) {
      p.life++;
      p.vx *= 0.985;
      p.vy = Math.min(p.vy + 0.26, 5.2);  // gravity + terminal velocity (floaty paper)
      p.tilt += p.vt;
      p.x += p.vx + Math.sin(p.tilt) * 0.7;
      p.y += p.vy;
      p.rot += p.vr;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.scale(1, Math.cos(p.tilt));
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.max - p.life) / 50));
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'tri') {
        ctx.beginPath(); ctx.moveTo(0, -p.h / 2); ctx.lineTo(p.w / 2, p.h / 2); ctx.lineTo(-p.w / 2, p.h / 2); ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.6);
      }
      ctx.restore();
    }
    if (parts.length) {
      requestAnimationFrame(step);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  function burst({ x = 0.5, y = 0.5, count = 120, angle = 90, spread = 70, speed = 16 } = {}) {
    for (let i = 0; i < count; i++) parts.push(make(x * W, y * H, angle, spread, speed));
    loop();
  }

  function cannons() {
    burst({ x: 0, y: 0.9, angle: 62, spread: 36, speed: 24, count: 160 });
    burst({ x: 1, y: 0.9, angle: 118, spread: 36, speed: 24, count: 160 });
  }

  function rain(duration = 4000) {
    const end = performance.now() + duration;
    (function drop() {
      for (let i = 0; i < 5; i++) {
        const p = make(Math.random() * W, -20, 270, 30, 3);
        p.vy = 1 + Math.random() * 3;
        p.vx = (Math.random() - 0.5) * 2;
        parts.push(p);
      }
      loop();
      if (performance.now() < end) requestAnimationFrame(drop);
    })();
  }

  return { burst, cannons, rain };
})();
