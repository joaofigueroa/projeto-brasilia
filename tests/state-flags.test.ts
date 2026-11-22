import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import states from "@/data/brazil-map.json";
import flags from "@/data/state-flags.json";

it("ships a verified local flag image for each of the 27 mapped federative units", () => {
  expect(Object.keys(flags).sort()).toEqual(states.map((state) => state.code).sort());
  for (const { file, source, sha256 } of Object.values(flags)) {
    expect(source).toMatch(/^https:\/\/www\.correios\.com\.br\//);
    const bytes = readFileSync(`public${file}`);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(sha256);
    expect(
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
        bytes.subarray(0, 3).toString() === "GIF" ||
        bytes.subarray(0, 2).equals(Buffer.from([255, 216])),
    ).toBe(true);
  }
});
