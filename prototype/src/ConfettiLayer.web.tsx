import confetti, { CreateTypes } from 'canvas-confetti';
import React, { CSSProperties, forwardRef, useImperativeHandle, useRef } from 'react';

export type ConfettiHandle = {
  fire: () => void;
};

const canvasStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 30,
};

export const ConfettiLayer = forwardRef<ConfettiHandle>(function ConfettiLayer(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<CreateTypes | null>(null);

  useImperativeHandle(ref, () => ({
    fire: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!instanceRef.current) {
        instanceRef.current = confetti.create(canvas, { resize: true, useWorker: false });
      }
      void instanceRef.current({
        particleCount: 150,
        angle: 90,
        spread: 118,
        startVelocity: 42,
        decay: 0.94,
        gravity: 0.92,
        drift: 0.08,
        ticks: 230,
        scalar: 0.72,
        shapes: ['square'],
        colors: ['#FFFFFF', '#FBBF24', '#F97316', '#C2570A', '#1E3A8A'],
        origin: { x: 0.5, y: 0.33 },
        disableForReducedMotion: true,
      });
    },
  }), []);

  return <canvas ref={canvasRef} aria-hidden="true" style={canvasStyle} />;
});
