import "server-only";
import AC from "@/data/municipalities/AC.json";
import AL from "@/data/municipalities/AL.json";
import AM from "@/data/municipalities/AM.json";
import AP from "@/data/municipalities/AP.json";
import BA from "@/data/municipalities/BA.json";
import CE from "@/data/municipalities/CE.json";
import DF from "@/data/municipalities/DF.json";
import ES from "@/data/municipalities/ES.json";
import GO from "@/data/municipalities/GO.json";
import MA from "@/data/municipalities/MA.json";
import MG from "@/data/municipalities/MG.json";
import MS from "@/data/municipalities/MS.json";
import MT from "@/data/municipalities/MT.json";
import PA from "@/data/municipalities/PA.json";
import PB from "@/data/municipalities/PB.json";
import PE from "@/data/municipalities/PE.json";
import PI from "@/data/municipalities/PI.json";
import PR from "@/data/municipalities/PR.json";
import RJ from "@/data/municipalities/RJ.json";
import RN from "@/data/municipalities/RN.json";
import RO from "@/data/municipalities/RO.json";
import RR from "@/data/municipalities/RR.json";
import RS from "@/data/municipalities/RS.json";
import SC from "@/data/municipalities/SC.json";
import SE from "@/data/municipalities/SE.json";
import SP from "@/data/municipalities/SP.json";
import TO from "@/data/municipalities/TO.json";
import type { MunicipalMap } from "@/types/intelligence";

const maps: Record<string, MunicipalMap> = {
  RO,
  AC,
  AM,
  RR,
  PA,
  AP,
  TO,
  MA,
  PI,
  CE,
  RN,
  PB,
  PE,
  AL,
  SE,
  BA,
  MG,
  ES,
  RJ,
  SP,
  PR,
  SC,
  RS,
  MS,
  MT,
  GO,
  DF,
};
export function getMunicipalMap(uf: string | null): MunicipalMap | null {
  return uf ? (maps[uf] ?? null) : null;
}
