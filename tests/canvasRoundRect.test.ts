import { describe, it, expect, vi } from 'vitest';
import { roundRect } from '../src/render/canvas.ts';

function mockCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('roundRect clamp (GG-003)', () => {
  it('returns early when w or h < 1 (empty path, no arcTo)', () => {
    const ctx = mockCtx();
    roundRect(ctx, 0, 0, 0, 10, 4);
    roundRect(ctx, 0, 0, 10, 0, 4);
    roundRect(ctx, 0, 0, -1, -1, 4);
    // beginPath clears any prior path so a following ctx.fill() is a no-op
    expect(ctx.beginPath).toHaveBeenCalledTimes(3);
    expect(ctx.arcTo).not.toHaveBeenCalled();
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.rect).not.toHaveBeenCalled();
  });

  it('clamps radius to max(0, min(r, w/2, h/2))', () => {
    const ctx = mockCtx();
    roundRect(ctx, 0, 0, 2, 2, 10);
    expect(ctx.beginPath).toHaveBeenCalled();
    const firstArc = (ctx.arcTo as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstArc[4]).toBe(1);
  });

  it('uses rect when clamped radius is 0', () => {
    const ctx = mockCtx();
    roundRect(ctx, 0, 0, 8, 8, -3);
    expect(ctx.rect).toHaveBeenCalledWith(0, 0, 8, 8);
    expect(ctx.arcTo).not.toHaveBeenCalled();
  });
});
