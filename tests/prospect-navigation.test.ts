import { describe, expect, it } from "vitest";
import { prospectPageHref, safeProspectReturnUrl } from "@/libs/prospect-navigation";

describe("prospect page navigation", () => {
  it("preserves territory, years, filters and pagination on the return to research", () => {
    const from =
      "/inteligencia?project=test&uf=DF&city=5300108&years=2022%2C2024&researchPage=4&researchQuery=oficina";
    const href = new URL(prospectPageHref("project", "company", from), "https://brasilia.invalid");
    expect(href.pathname).toBe("/clientes/company");
    expect(href.searchParams.get("from")).toBe(from);
    expect(safeProspectReturnUrl(href.searchParams.get("from") ?? undefined, "/inteligencia")).toBe(
      from,
    );
  });
  it("never turns an untrusted return parameter into an external or unrelated navigation", () => {
    for (const input of [
      "//evil.test",
      "https://evil.test",
      "javascript:alert(1)",
      "/inteligencia/../perfil",
      "/inteligencia-maliciosa",
      "/inteligencia\\@evil.test",
      "/inteligencia\n",
      "/perfil",
    ])
      expect(safeProspectReturnUrl(input, "/inteligencia?project=safe")).toBe(
        "/inteligencia?project=safe",
      );
  });
});
