import { describe, expect, it } from "vitest";
import dataset from "@/data/research/3c-automotive.json";
import { googleMapsEmbedUrl, googleMapsSearchQuery } from "@/libs/google-business";
import { commercialResearchSchema, googleNoteFieldsSchema } from "@/validators/commercial-research";

const profile =
  commercialResearchSchema.parse(dataset).prospects.find((item) => item.registry) ??
  commercialResearchSchema.parse(dataset).prospects[0];
const fields = {
  rating: null,
  reviewCount: null,
  checkedAt: "2026-11-22",
  mapsUrl: "",
  reviews: [],
};
describe("Google Maps profile embedding", () => {
  it("uses the exact company address and escapes queries without changing the destination", () => {
    const query = googleMapsSearchQuery(profile);
    expect(query).toContain(profile.cityName);
    expect(query).toContain(profile.registry?.address);
    const url = new URL(googleMapsEmbedUrl(`${query} &output=other <iframe>`));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps");
    expect(url.searchParams.get("output")).toBe("embed");
    expect(url.searchParams.get("q")).toContain("&output=other <iframe>");
    expect(url.searchParams.has("key")).toBe(false);
  });
  it("keeps previous manual notes compatible and allows only a no-key Google share embed", () => {
    expect(googleNoteFieldsSchema.parse(fields).embedUrl).toBe("");
    expect(
      googleNoteFieldsSchema.parse({
        ...fields,
        embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12",
      }).embedUrl,
    ).toContain("pb=");
    const embedded = googleNoteFieldsSchema.parse({
      ...fields,
      embedUrl:
        '<iframe src="https://www.google.com/maps/embed?pb=!1m18&amp;hl=pt-BR" width="600" loading="lazy"></iframe>',
    });
    expect(embedded.embedUrl).toBe("https://www.google.com/maps/embed?pb=!1m18&hl=pt-BR");
    expect(embedded.embedUrl).not.toContain("<iframe");
    for (const embedUrl of [
      "https://www.google.com.evil.test/maps/embed?pb=!1m18",
      "https://evil.test/maps/embed?pb=!1m18",
      "https://www.google.com/maps/embed/v1/place?key=secret&q=Company",
      "https://www.google.com/maps/embed?pb=!1m18&key=secret",
      "https://user:password@www.google.com/maps/embed?pb=!1m18",
      "javascript:alert(1)",
      '<iframe src="https://evil.test/"></iframe>',
    ])
      expect(googleNoteFieldsSchema.safeParse({ ...fields, embedUrl }).success).toBe(false);
  });
});
