import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import automakers from "@/data/automaker-logos.json";
import { prospectAutomakers } from "@/libs/prospect-automakers";

describe("manufacturer identification", () => {
  it("resolves accent and alias variations without duplicating confirmed brands", () => {
    const result = prospectAutomakers({
      specialization: "specialist",
      brands: ["CITROEN", "Citroën", "Peugeot", "DS", "DS Automobiles"],
    });
    expect(result.logos.map((brand) => brand.name)).toEqual([
      "Citroën",
      "Peugeot",
      "DS Automobiles",
    ]);
    expect(result.remaining).toEqual([]);
    expect(result.illustrated).toBe(false);
  });

  it("keeps unverified brand references unconfirmed instead of displaying specialist logos", () => {
    const result = prospectAutomakers({
      specialization: "unconfirmed",
      brands: ["Peugeot", "Citroën"],
    });
    expect(result.logos).toEqual([]);
    expect(result.remaining).toEqual(["Peugeot", "Citroën"]);
    expect(result.illustrated).toBe(false);
  });

  it("distinguishes an illustrative multibrand stack from declared coverage", () => {
    const generic = prospectAutomakers({ specialization: "multibrand", brands: [] });
    expect(generic.illustrated).toBe(true);
    expect(generic.logos).toHaveLength(3);
    const specific = prospectAutomakers({
      specialization: "multibrand",
      brands: ["VW", "Marca local"],
    });
    expect(specific.illustrated).toBe(false);
    expect(specific.logos.map((brand) => brand.name)).toEqual(["Volkswagen"]);
    expect(specific.remaining).toEqual(["Marca local"]);
    expect(prospectAutomakers({ specialization: "specialist", brands: [] }).logos).toEqual([]);
  });

  it("ships every referenced logo as a passive local vector", () => {
    for (const brand of automakers) {
      expect(brand.file).toMatch(/^\/automakers\/[a-z]+\.svg$/);
      const svg = readFileSync(new URL(`../public${brand.file}`, import.meta.url), "utf8");
      expect(svg).toContain('viewBox="0 0 24 24"');
      expect(svg).toContain("<path");
      expect(svg).not.toMatch(/<\/?(?:script|foreignObject|image|use|a)\b|\bon\w+\s*=|\bhref\s*=/i);
    }
  });
});
