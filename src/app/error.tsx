"use client";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="centered-state">
      <span className="state-icon">
        <RefreshCw size={25} />
      </span>
      <h1>Erro ao carregar a página</h1>
      <p>Não foi possível carregar os dados. Tente novamente.</p>
      <button type="button" className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
