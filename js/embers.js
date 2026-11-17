/* Фоновые искры (2D canvas) — общие для презентации и игры */
(function () {
  const c = document.getElementById('embers'); if (!c) return;
  const ctx = c.getContext('2d'); let W, H, P = [];
  const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const spawn = (y) => ({ x: Math.random() * W, y: y ?? H + 10, r: 0.6 + Math.random() * 2.2, v: 0.3 + Math.random() * 1.1, w: Math.random() * 6.28, life: 0.4 + Math.random() * 0.6 });
  for (let i = 0; i < 90; i++) P.push(spawn(Math.random() * H));
  let last = performance.now();
  (function tick(now) {
    const dt = Math.min(50, now - last) / 16.7; last = now;
    ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
    for (const p of P) {
      p.y -= p.v * dt; p.w += 0.03 * dt; p.x += Math.sin(p.w) * 0.4 * dt;
      if (p.y < -10) Object.assign(p, spawn());
      const a = Math.min(1, p.y / H + 0.15) * p.life;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255,190,110,${a})`); g.addColorStop(0.4, `rgba(255,100,30,${a * 0.5})`); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.28); ctx.fill();
    }
    requestAnimationFrame(tick);
  })(last);
})();
