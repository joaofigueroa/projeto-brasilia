import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import {
  importIntelligenceRecordsAction,
  saveAnalysisTabAction,
  saveIntelligenceRecordAction,
} from "@/server/actions/intelligence";
import type { AnalysisTab, IntelligenceData, IntelligenceRecord } from "@/types/intelligence";
export function useIntelligence(data: IntelligenceData) {
  const { navigate, pending: navigating, router } = useNavigation();
  const [pending, startTransition] = useTransition();
  const [editor, setEditor] = useState<IntelligenceRecord | "new" | null>(null);
  const [tabEditor, setTabEditor] = useState<AnalysisTab | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const scope = {
    project: data.project.id,
    tab: data.tab.id,
    region: data.territory.region ?? undefined,
    uf: data.territory.uf ?? undefined,
    city: data.territory.city ?? undefined,
    year: data.year,
  };
  function openRecord(record: IntelligenceRecord | "new") {
    setError("");
    setEditor(record);
  }
  function openTab(tab: AnalysisTab | "new") {
    setError("");
    setTabEditor(tab);
  }
  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");
    setError("");
    startTransition(async () => {
      const record = editor !== "new" ? editor : null;
      const detail = (key: string) => (form.has(key) ? text(key) : (record?.details[key] ?? ""));
      const target = record
        ? {
            ...scope,
            year: record.year,
            region: record.regionCode ?? undefined,
            uf: record.stateCode ?? undefined,
            city: record.municipalityCode ?? undefined,
          }
        : { ...scope, year: Number(form.get("year") ?? data.year) };
      const result = await saveIntelligenceRecordAction({
        scope: target,
        id: record?.id,
        version: record?.version,
        fields: {
          title: text("title"),
          category: text("category"),
          metric: text("metric") || "context",
          value: text("value") ? Number(text("value")) : null,
          unit: text("unit") || "unidades",
          sourceName: text("sourceName"),
          sourceUrl: text("sourceUrl"),
          notes: text("notes"),
          status: text("status") || "new",
          details: {
            make: detail("make"),
            model: detail("model"),
            vehicleType: detail("vehicleType"),
            manufactureYear: detail("manufactureYear"),
            contact: detail("contact"),
          },
        },
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditor(null);
      setNotice("Registro salvo.");
      router.refresh();
    });
  }
  function saveTab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tab = tabEditor !== "new" ? tabEditor : null;
    const list = (key: string) =>
      String(form.get(key) ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    setError("");
    startTransition(async () => {
      const result = await saveAnalysisTabAction({
        projectId: data.project.id,
        id: tab?.id,
        version: tab?.version,
        name: String(form.get("name") ?? ""),
        kind: tab?.kind ?? String(form.get("kind") ?? "market"),
        segments: list("segments"),
        keywords: list("keywords"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setTabEditor(null);
      setNotice("Aba salva.");
      navigate({ tab: result.data });
      router.refresh();
    });
  }
  function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    const pasted = String(form.get("csv") ?? "").trim();
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && !pasted) {
      setError("Selecione um arquivo CSV ou cole o conteúdo.");
      return;
    }
    if ((hasFile && file.size > 512000) || new TextEncoder().encode(pasted).length > 512000) {
      setError("Use um CSV de até 500 KB.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await importIntelligenceRecordsAction({
        scope: { ...scope, year: Number(form.get("year") ?? data.year) },
        csv: hasFile ? await file.text() : pasted,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setImporting(false);
      setNotice(
        result.data === 1 ? "1 registro importado." : `${result.data} registros importados.`,
      );
      router.refresh();
    });
  }
  return {
    navigate,
    navigating,
    pending,
    editor,
    tabEditor,
    importing,
    error,
    notice,
    openRecord,
    openTab,
    saveRecord,
    saveTab,
    importCsv,
    closeRecord: () => setEditor(null),
    closeTab: () => setTabEditor(null),
    closeImport: () => setImporting(false),
    openImport: () => {
      setError("");
      setImporting(true);
    },
    dismissNotice: () => setNotice(""),
  };
}
export type IntelligenceController = ReturnType<typeof useIntelligence>;
