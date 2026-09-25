export const CONFETTI_LIFETIME = 1800;
export const confettiPieces = Array.from({ length: 40 }, (_, i) => {
  const seed = ((i * 7919 + 1237) % 1000) / 1000;
  const angle = ((-145 + seed * 110) * Math.PI) / 180;
  const speed = 600 + ((i * 139) % 301);
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    spin: (180 + ((i * 37) % 541)) * (i % 2 ? 1 : -1),
    shape: i % 3,
    color: i % 5,
  };
});
export function particlePosition(index: number, milliseconds: number) {
  'worklet';
  const p = confettiPieces[index],
    seconds = milliseconds / 1000;
  const drag = -Math.log(0.985) * 60;
  const travel = (1 - Math.exp(-drag * seconds)) / drag;
  return {
    x: p.vx * travel,
    y: p.vy * travel + 700 * seconds * seconds,
    rotation: p.spin * seconds,
    opacity: Math.max(0, Math.min(1, (1800 - milliseconds) / 600)),
  };
}
