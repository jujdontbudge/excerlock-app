type Size = { width: number; height: number };

export function fitViewport(application: Size, surface: Size) {
  if (![application.width, application.height, surface.width, surface.height].every((value) => Number.isFinite(value) && value > 0))
    throw new Error('Simulator viewport dimensions must be positive');
  const scale = Math.min(surface.width / application.width, surface.height / application.height);
  const width = application.width * scale, height = application.height * scale;
  return { scale, width, height, x: (surface.width - width) / 2, y: (surface.height - height) / 2 };
}
