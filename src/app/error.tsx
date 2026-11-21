"use client";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="centered-state">
      <span className="state-icon">
        <RefreshCw size={25} />
      </span>
      <h1>Vamos tentar mais uma vez?</h1>
      <p>Não foi possível carregar este espaço agora.</p>
      <button type="button" className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </div>
  );
}
