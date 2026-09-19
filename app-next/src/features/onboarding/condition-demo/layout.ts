export function sceneGeometry(width: number, height: number) {
  // Reserve actual device points for the status and timeline. Keep feet 52 pt
  // above the bottom even when a tall stage grows independently of its width.
  const scale = Math.min(1, width / 400, (height - 116) / 312);
  const top = 76 * (1 - scale);
  return {
    scale,
    left: (width - 400 * scale) / 2,
    top,
    height: (height - top - 52 + 52 * scale) / scale,
  };
}
