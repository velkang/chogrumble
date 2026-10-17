import { describe, expect, it } from 'vitest';
import { BONE_INDEX, computeSkinWeights, smoothstep, vertexWeights } from './skin-weights';

const positions = (pts: [number, number][]) => ({
  count: pts.length,
  getX: (i: number) => pts[i]![0],
  getY: (i: number) => pts[i]![1],
});

const dominant = (w: number[]) => w.indexOf(Math.max(...w));

describe('smoothstep', () => {
  it('clamps outside the edges and eases between them', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });
});

describe('vertexWeights', () => {
  it('gives the head bone the top of the model', () => {
    expect(dominant(vertexWeights(0, 0.8))).toBe(BONE_INDEX.head);
  });

  it('splits arms by side: +x is armL, -x is armR', () => {
    expect(dominant(vertexWeights(0.4, 0.45))).toBe(BONE_INDEX.forearmL);
    expect(dominant(vertexWeights(-0.4, 0.45))).toBe(BONE_INDEX.forearmR);
  });

  it('keeps upper and lower limbs separate from torso and head', () => {
    expect(dominant(vertexWeights(0.295, 0.45))).toBe(BONE_INDEX.armL);
    expect(dominant(vertexWeights(0.1, 0.11))).toBe(BONE_INDEX.legL);
    expect(vertexWeights(0, 0.8).slice(8)).toEqual([0, 0, 0, 0]);
    expect(vertexWeights(0, 0.3).slice(8)).toEqual([0, 0, 0, 0]);
  });

  it('splits legs by side near the floor', () => {
    expect(dominant(vertexWeights(0.1, 0.02))).toBe(BONE_INDEX.shinL);
    expect(dominant(vertexWeights(-0.1, 0.02))).toBe(BONE_INDEX.shinR);
  });

  it('gives the torso to hips low down and spine higher up', () => {
    expect(dominant(vertexWeights(0, 0.15))).toBe(BONE_INDEX.hips);
    expect(dominant(vertexWeights(0, 0.45))).toBe(BONE_INDEX.spine);
  });
});

describe('computeSkinWeights', () => {
  const pts: [number, number][] = [
    [0, 0.8],
    [0.4, 0.45],
    [-0.1, 0.02],
    [0, 0.3],
  ];

  it('returns four normalized influences per vertex', () => {
    const { indices, weights } = computeSkinWeights(positions(pts));
    expect(indices).toHaveLength(pts.length * 4);
    expect(weights).toHaveLength(pts.length * 4);
    for (let v = 0; v < pts.length; v++) {
      const sum = [0, 1, 2, 3].reduce((s, j) => s + weights[v * 4 + j]!, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it('lists the strongest bone first', () => {
    const { indices } = computeSkinWeights(positions(pts));
    expect(indices[0]).toBe(BONE_INDEX.head);
    expect(indices[4]).toBe(BONE_INDEX.forearmL);
    expect(indices[8]).toBe(BONE_INDEX.shinR);
  });
});
