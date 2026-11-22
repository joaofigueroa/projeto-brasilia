import { describe, expect, it } from "vitest";
import { clampMapCenter } from "@/hooks/use-map-viewport";

describe("map viewport bounds", () => {
  it("keeps a full map centered and prevents dragging beyond the map at any zoom", () => {
    expect(clampMapCenter([-10000, 10000], 1)).toEqual([290, 280]);
    expect(clampMapCenter([-10000, 10000], 2)).toEqual([145, 420]);
    expect(clampMapCenter([10000, -10000], 2)).toEqual([435, 140]);
    expect(clampMapCenter([300, 270], 6)).toEqual([300, 270]);
    const [x, y] = clampMapCenter([0, 0], 6);
    expect(x - 290 / 6).toBe(0);
    expect(y - 280 / 6).toBe(0);
  });
});
