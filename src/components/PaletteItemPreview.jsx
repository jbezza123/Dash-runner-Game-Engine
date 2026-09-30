/**
 * Miniature canvas preview for level editor palette items.
 * Renders authentic in-game visual sprites for blocks, hazards, orbs, pads, and portals.
 */

import { useRef, useEffect } from 'react';
import { TILE_SIZE } from '../constants/gameDefaults.js';
import { drawLevelObject } from '../engine/levelRenderer.js';

export default function PaletteItemPreview({ type, itemType, size = 42, rotation = 0 }) {
  const canvasRef = useRef(null);
  const targetType = type || itemType || '';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!targetType || typeof targetType !== 'string') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let animId;
    let hasWarned = false;

    const render = () => {
      const timeNow = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      try {
        if (targetType.startsWith('portal_')) {
          // Portals are 2 tiles tall (topY is screenY - TILE_SIZE, height is 2*TILE_SIZE)
          const scale = (size * 0.8) / (TILE_SIZE * 2);
          ctx.translate(size / 2, size / 2);
          ctx.scale(scale, scale);
          ctx.translate(-TILE_SIZE / 2, 0);
          drawLevelObject(ctx, { type: targetType, rotation }, 0, 0, timeNow);
        } else if (targetType === 'finish_gate' || targetType === 'finish_gate_full') {
          // Gate is 3 tiles tall for standard, or full height preview
          const isFull = targetType === 'finish_gate_full';
          const scale = (size * 0.85) / (TILE_SIZE * 3);
          ctx.translate(size / 2, size / 2);
          ctx.scale(scale, scale);
          ctx.translate(-TILE_SIZE / 2, TILE_SIZE / 2);
          drawLevelObject(
            ctx,
            { type: targetType, rotation, spanFull: isFull },
            0,
            0,
            timeNow,
            isFull ? -TILE_SIZE * 2 : null,
            isFull ? TILE_SIZE : null,
            TILE_SIZE
          );
        } else if (targetType.startsWith('pad_')) {
          // Launch pads rest at the bottom of the tile
          const padSize = size * 0.72;
          const scale = padSize / TILE_SIZE;
          ctx.translate((size - padSize) / 2, (size - padSize) / 2 + 3);
          ctx.scale(scale, scale);
          drawLevelObject(ctx, { type: targetType, rotation }, 0, 0, timeNow);
        } else {
          // Standard blocks, spikes, orbs, and coins
          const contentSize = size * 0.72;
          const scale = contentSize / TILE_SIZE;
          ctx.translate((size - contentSize) / 2, (size - contentSize) / 2);
          ctx.scale(scale, scale);
          drawLevelObject(ctx, { type: targetType, rotation }, 0, 0, timeNow);
        }
      } catch (err) {
        if (!hasWarned) {
          hasWarned = true;
          console.warn('Error rendering preview sprite for:', targetType, err);
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [targetType, size, rotation]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block rounded-lg bg-neutral-900/90 shadow-inner border border-neutral-750/60 pointer-events-none"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
