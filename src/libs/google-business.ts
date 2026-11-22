import type { ResearchProspect } from "@/types/commercial-research";
export function googleMapsProfileUrl(prospect: ResearchProspect) {
  return (
    prospect.google?.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([prospect.name, prospect.registry?.address, prospect.cityName, prospect.state].filter(Boolean).join(" "))}`
  );
}
