export function sceneGeometry(width: number, height: number) {
  // The studio scene is full-bleed: scale to the available width and let the
  // authored world extend vertically instead of reserving banner/timeline space.
  const scale = Math.min(1.18, width / 400);
  const top = 0;
  return {
    scale,
    left: (width - 400 * scale) / 2,
    top,
    height: height / scale,
  };
}
