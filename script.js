(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ============ Estrellitas de fondo ============ */
  const starsCanvas = document.getElementById("stars");
  const sctx = starsCanvas.getContext("2d");
  const STAR_COLORS = ["#ffffff", "#e4ebf2", "#bff6ff", "#7cc4ff", "#2f8cff", "#1a5fd0", "#c9d3de"];
  let stars = [];
  let sw = 0, sh = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function initStars() {
    sw = window.innerWidth;
    sh = window.innerHeight;
    starsCanvas.width = sw * dpr;
    starsCanvas.height = sh * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((sw * sh) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: rand(0, sw),
      y: rand(0, sh),
      r: rand(3, 11),
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      speed: rand(0.6, 2.2),
      phase: rand(0, Math.PI * 2),
      rot: rand(-0.3, 0.3)
    }));
  }

  function drawStar(ctx, x, y, r, rot) {
    // Estrella de 4 puntas
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
    ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
    ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
    ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function renderStars(t) {
    sctx.clearRect(0, 0, sw, sh);
    for (const s of stars) {
      const tw = reduceMotion ? 0.8 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase));
      sctx.globalAlpha = tw;
      sctx.fillStyle = s.color;
      drawStar(sctx, s.x, s.y, s.r * (0.75 + 0.25 * tw), s.rot);
    }
    sctx.globalAlpha = 1;
  }

  /* ============ Bola de boliche ============ */
  class DiscoBall {
    constructor(canvas) {
      this.canvas = canvas;
      this.size = parseInt(canvas.dataset.size, 10) || 150;
      this.seed = parseInt(canvas.dataset.seed, 10) || 1;
      this.bands = 14;
      this.segs = 28;
      this.tiles = [];
      let s = this.seed;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < this.bands * this.segs; i++) this.tiles.push(rnd());

      const stringLen = 90;
      this.stringLen = stringLen;
      canvas.style.width = this.size + "px";
      canvas.style.height = this.size + stringLen + "px";
      canvas.width = this.size * dpr;
      canvas.height = (this.size + stringLen) * dpr;
      this.ctx = canvas.getContext("2d");
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    draw(t) {
      const { ctx, size, bands, segs, tiles } = this;
      const R = size * 0.47;
      const cx = size / 2;
      const cy = this.stringLen + size / 2;
      ctx.clearRect(0, 0, size, size + this.stringLen);

      // Hilo
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, cy - R);
      ctx.stroke();

      // Sombra
      ctx.save();
      ctx.shadowColor = "rgba(10,63,120,.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#6f8aa8";
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const rot = reduceMotion ? 0 : t * 0.0007 * (this.seed % 2 ? 1 : -1);
      const L = { x: -0.45, y: -0.55, z: 0.7 };
      const ll = Math.hypot(L.x, L.y, L.z);
      L.x /= ll; L.y /= ll; L.z /= ll;

      const pt = (lat, lon) => ({
        x: cx + R * Math.cos(lat) * Math.sin(lon),
        y: cy - R * Math.sin(lat),
        z: Math.cos(lat) * Math.cos(lon)
      });

      for (let i = 0; i < bands; i++) {
        const lat0 = -Math.PI / 2 + (Math.PI * i) / bands;
        const lat1 = -Math.PI / 2 + (Math.PI * (i + 1)) / bands;
        const latM = (lat0 + lat1) / 2;
        for (let j = 0; j < segs; j++) {
          const lon0 = (Math.PI * 2 * j) / segs + rot;
          const lon1 = (Math.PI * 2 * (j + 1)) / segs + rot;
          const lonM = (lon0 + lon1) / 2;
          const nz = Math.cos(latM) * Math.cos(lonM);
          if (nz <= 0.03) continue;
          const nx = Math.cos(latM) * Math.sin(lonM);
          const ny = Math.sin(latM);
          const diff = Math.max(0, nx * L.x + (-ny) * L.y + nz * L.z);
          const r = tiles[i * segs + j];
          const spark = reduceMotion ? 0 : Math.pow(Math.abs(Math.sin(t * 0.0016 * (0.6 + r * 2.4) + r * 60)), 22);

          const light = 30 + 38 * diff + r * 14 + spark * 40;
          const sat = 14 + r * 38;
          const hue = 200 + r * 20;
          ctx.fillStyle = `hsl(${hue} ${sat}% ${Math.min(96, light)}%)`;

          const a = pt(lat0, lon0), b = pt(lat0, lon1), c = pt(lat1, lon1), d = pt(lat1, lon0);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(d.x, d.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(20,60,110,.45)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // Volumen: sombreado en el borde y brillo
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, "rgba(255,255,255,.35)");
      g.addColorStop(0.45, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(5,40,90,.55)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
    }
  }

  const balls = Array.from(document.querySelectorAll(".ball")).map(c => new DiscoBall(c));

  /* ============ Loop de animación ============ */
  function frame(t) {
    renderStars(t);
    for (const b of balls) b.draw(t);
    if (!reduceMotion) requestAnimationFrame(frame);
  }

  initStars();
  requestAnimationFrame(frame);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { initStars(); if (reduceMotion) renderStars(0); }, 150);
  });

  /* ============ Aparición al scrollear ============ */
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add("is-visible"));
  }
})();
