import Link from "next/link";

export default function NotFound() {
  return (
    <div className="centered-state">
      <h1>Página não encontrada</h1>
      <p>A página solicitada não está disponível.</p>
      <Link className="button primary" href="/tarefas">
        Ir para tarefas
      </Link>
    </div>
  );
}
