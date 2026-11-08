// Animacion de agua en canvas: capas de olas y burbujas que suben. Respeta "reducir movimiento".
export function animateWater(canvas, { layers = 3, bubbles = 26, height = 0.55, intensity = 1 } = {}) {
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let h = 0;
  let frame;
  let t = 0;
  const dots = Array.from({ length: bubbles }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, s: 0.2 + Math.random() * 0.6 }));

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const draw = () => {
    ctx.clearRect(0, 0, width, h);
    for (let i = 0; i < layers; i++) {
      const base = h * (1 - height) + i * 14;
      const amp = (10 + i * 6) * intensity;
      const gradient = ctx.createLinearGradient(0, base - amp, 0, h);
      gradient.addColorStop(0, `rgba(34, 199, 240, ${0.28 - i * 0.06})`);
      gradient.addColorStop(1, `rgba(30, 109, 255, ${0.05 + i * 0.03})`);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= width; x += 8) {
        const y = base + Math.sin(x / (90 + i * 30) + t * (0.9 + i * 0.3)) * amp + Math.sin(x / 41 + t * 1.7) * amp * 0.25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, h);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = `rgba(120, 230, 255, ${0.35 - i * 0.08})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    dots.forEach((d) => {
      d.y -= d.s * 0.004;
      if (d.y < 0) { d.y = 1; d.x = Math.random(); }
      const x = d.x * width + Math.sin(t * 2 + d.x * 10) * 6;
      const y = h * (1 - height) + d.y * h * height;
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(180, 240, 255, 0.45)";
      ctx.fill();
    });
    t += 0.016;
    if (!reduced) frame = requestAnimationFrame(draw);
  };
  draw();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}
