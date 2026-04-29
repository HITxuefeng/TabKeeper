class FireworksEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.animId = null;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  launch(x, y) {
    this.resize();
    const colors = [
      "#ff6584", "#6c63ff", "#ffd32a", "#2ed573", "#ffa502",
      "#ff4757", "#1e90ff", "#ff6b81", "#a29bfe", "#fdcb6e"
    ];
    const count = 60 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 3;
      this.particles.push({
        x: x ?? this.canvas.width / 2,
        y: y ?? this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size,
        decay: 0.015 + Math.random() * 0.01,
        gravity: 0.06 + Math.random() * 0.04,
        trail: []
      });
    }
    this._start();
  }

  _start() {
    if (this.animId) return;
    this._loop();
  }

  _loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles = this.particles.filter(p => p.alpha > 0.02);

    for (const p of this.particles) {
      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
      if (p.trail.length > 5) p.trail.shift();

      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const trailAlpha = (i / p.trail.length) * p.alpha * 0.4;
        ctx.save();
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      p.size *= 0.995;
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(() => this._loop());
    } else {
      this.animId = null;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

window.FireworksEngine = FireworksEngine;
