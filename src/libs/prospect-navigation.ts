export function prospectPageHref(projectId: string, id: string, from: string) {
  return `/clientes/${encodeURIComponent(id)}?${new URLSearchParams({ project: projectId, from })}`;
}
export function safeProspectReturnUrl(value: string | undefined, fallback: string) {
  if (!value || value.length > 4000 || !value.startsWith("/inteligencia") || /[\\\r\n]/.test(value))
    return fallback;
  try {
    const url = new URL(value, "https://brasilia.invalid");
    return url.origin === "https://brasilia.invalid" && url.pathname === "/inteligencia"
      ? `${url.pathname}${url.search}`
      : fallback;
  } catch {
    return fallback;
  }
}
