import capitals from "@/data/vehicle-capitals.json";

export function vehicleCapitalCode(uf: string | null) {
  return uf ? (capitals[uf as keyof typeof capitals] ?? null) : null;
}

export function isVehicleTerritoryIncluded(uf: string | null, city: string | null) {
  return city === null || (uf !== null && vehicleCapitalCode(uf) === city);
}
