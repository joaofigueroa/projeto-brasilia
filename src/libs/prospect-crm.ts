export const crmStages = [
  "new_lead",
  "contact_attempt",
  "qualifying",
  "meeting_scheduled",
  "proposal_sent",
  "negotiating",
  "closing",
] as const;
export type CrmStage = (typeof crmStages)[number];
export const crmStageLabels: Record<CrmStage, string> = {
  new_lead: "Novo Lead",
  contact_attempt: "Tentativa de Contato",
  qualifying: "Em Qualificação",
  meeting_scheduled: "Reunião Agendada",
  proposal_sent: "Proposta Enviada",
  negotiating: "Em Negociação",
  closing: "Fechamento / Contrato",
};
export const crmStageDescriptions: Record<CrmStage, string> = {
  new_lead: "Contato na base, ainda sem abordagem.",
  contact_attempt: "Abordagem iniciada; aguardando resposta.",
  qualifying: "Validação de perfil, necessidade, orçamento e prazo.",
  meeting_scheduled: "Diagnóstico, demonstração ou visita comercial marcada.",
  proposal_sent: "Orçamento apresentado; aguardando retorno do decisor.",
  negotiating: "Ajuste de valores, prazos, escopo ou condições.",
  closing: "Aceite realizado; aguardando assinatura ou pagamento inicial.",
};
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const attachmentTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  odt: ["application/vnd.oasis.opendocument.text"],
  ods: ["application/vnd.oasis.opendocument.spreadsheet"],
};
export const attachmentAccept = Object.keys(attachmentTypes)
  .map((type) => `.${type}`)
  .join(",");
export function attachmentMime(name: string, supplied: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const allowed = attachmentTypes[extension];
  if (
    !allowed ||
    (supplied && supplied !== "application/octet-stream" && !allowed.includes(supplied))
  )
    return null;
  return allowed[0];
}

export function attachmentPreviewKind(contentType: string | null) {
  switch (contentType) {
    case "application/pdf":
      return "pdf";
    case "image/png":
    case "image/jpeg":
    case "image/webp":
      return "image";
    default:
      return null;
  }
}

export function fileSizeLabel(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
