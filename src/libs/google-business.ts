import type { ResearchProspect } from "@/types/commercial-research";
export function normalizeGoogleMapsEmbedInput(input: string) {
  const value = input.trim();
  if (!value.startsWith("<")) return value;
  const frame = value.match(/^<iframe\s+[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>\s*<\/iframe>$/i);
  return frame?.[2].replaceAll("&amp;", "&") ?? value;
}
export function googleMapsSearchQuery(prospect: ResearchProspect) {
  return [prospect.name, prospect.registry?.address, prospect.cityName, prospect.state]
    .filter(Boolean)
    .join(", ");
}
export function googleMapsEmbedUrl(query: string) {
  const url = new URL("https://www.google.com/maps");
  url.searchParams.set("q", query);
  url.searchParams.set("output", "embed");
  url.searchParams.set("hl", "pt-BR");
  return url.toString();
}
export function googleMapsProfileUrl(prospect: ResearchProspect) {
  return (
    prospect.google?.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([prospect.name, prospect.registry?.address, prospect.cityName, prospect.state].filter(Boolean).join(" "))}`
  );
}
