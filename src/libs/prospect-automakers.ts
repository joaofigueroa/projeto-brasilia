import automakers from "@/data/automaker-logos.json";
import type { ResearchProspect } from "@/types/commercial-research";

function brandKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const brandsByName = new Map(
  automakers.flatMap((brand) =>
    [brand.name, ...brand.aliases].map((name) => [brandKey(name), brand] as const),
  ),
);
const illustrativeBrands = ["Volkswagen", "Chevrolet", "Fiat"];

export function prospectAutomakers(prospect: Pick<ResearchProspect, "specialization" | "brands">) {
  const illustrated = prospect.specialization === "multibrand" && prospect.brands.length === 0;
  // Unverified references must not look like confirmed manufacturer coverage.
  const names =
    prospect.specialization === "unconfirmed"
      ? []
      : illustrated
        ? illustrativeBrands
        : prospect.brands;
  const logos = new Map<string, (typeof automakers)[number]>();
  const remaining = new Set<string>();
  for (const name of names) {
    const brand = brandsByName.get(brandKey(name));
    if (brand) logos.set(brand.file, brand);
    else remaining.add(name);
  }
  if (prospect.specialization === "unconfirmed") {
    for (const name of prospect.brands) remaining.add(name);
  }
  return { logos: [...logos.values()], remaining: [...remaining], illustrated };
}
