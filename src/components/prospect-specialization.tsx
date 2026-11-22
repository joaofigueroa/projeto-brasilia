import { researchSpecializationLabels } from "@/libs/commercial-research";
import { prospectAutomakers } from "@/libs/prospect-automakers";
import type { ResearchProspect } from "@/types/commercial-research";

export function ProspectSpecialization({
  prospect,
  compact = false,
}: {
  prospect: Pick<ResearchProspect, "specialization" | "brands">;
  compact?: boolean;
}) {
  const { logos, remaining, illustrated } = prospectAutomakers(prospect);
  const multibrand = prospect.specialization === "multibrand";
  return (
    <span className={`prospect-specialization${compact ? " compact" : ""}`}>
      {logos.length > 0 && (
        <span
          className={`automaker-logos${multibrand ? " stacked" : ""}`}
          title={
            illustrated
              ? "Multimarcas. Logos ilustrativas; marcas atendidas a confirmar."
              : undefined
          }
          aria-hidden={illustrated ? true : undefined}
        >
          {logos.map((brand) => (
            <span
              className="automaker-logo"
              key={brand.file}
              title={illustrated ? undefined : brand.name}
            >
              <img src={brand.file} width={17} height={17} alt={illustrated ? "" : brand.name} />
            </span>
          ))}
        </span>
      )}
      <span>
        {researchSpecializationLabels[prospect.specialization]}
        {remaining.length > 0 ? ` · ${remaining.join(" / ")}` : ""}
      </span>
    </span>
  );
}
