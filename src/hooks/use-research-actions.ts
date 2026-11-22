import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  generateCityAnalysisAction,
  processCityResearchAction,
  startCityResearchAction,
} from "@/server/actions/commercial-research";
import type { ResearchRun } from "@/types/commercial-research";
export function useResearchActions(
  projectId: string,
  cityCode: string | null,
  initialRun: ResearchRun | undefined,
) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [working, setWorking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const epoch = useRef(0);
  useEffect(
    () => () => {
      epoch.current += 1;
    },
    [],
  );
  async function update() {
    if (!cityCode || working || generating) return;
    const currentEpoch = ++epoch.current;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const started = await startCityResearchAction({ projectId, cityCode });
      if (!started.success) {
        setError(started.error);
        return;
      }
      let current: ResearchRun | null = started.data;
      setRun(current);
      if (current.status === "completed") {
        setNotice(`O cadastro já está atualizado na competência ${current.sourceMonth}.`);
        router.refresh();
        return;
      }
      while (
        current &&
        currentEpoch === epoch.current &&
        !["completed", "failed"].includes(current.status)
      ) {
        const result = await processCityResearchAction({ projectId, runId: current.id });
        if (!result.success) {
          setError(result.error);
          break;
        }
        current = result.data;
        if (currentEpoch !== epoch.current) break;
        setRun(current ?? undefined);
        if (current?.status === "running") {
          setNotice(
            "A atualização está em outra execução. O progresso está salvo; retome em alguns instantes.",
          );
          break;
        }
        if (current?.status === "completed") {
          setNotice("Cadastro atualizado. Você pode gerar uma nova análise desta cidade.");
          router.refresh();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    } catch {
      setError("A conexão foi interrompida. Retome a atualização; o progresso está salvo.");
    } finally {
      if (currentEpoch === epoch.current) setWorking(false);
    }
  }
  function pause() {
    epoch.current += 1;
    setWorking(false);
    setNotice(
      "Atualização pausada nesta janela. O lote em andamento pode concluir; retome quando quiser.",
    );
  }
  async function generate() {
    if (!cityCode || working || generating) return;
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const result = await generateCityAnalysisAction({ projectId, cityCode });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice("Nova análise gerada e salva para esta cidade.");
      router.refresh();
    } catch {
      setError("A conexão foi interrompida. A análise anterior continua disponível.");
    } finally {
      setGenerating(false);
    }
  }
  return { run, working, generating, error, notice, update, pause, generate };
}
