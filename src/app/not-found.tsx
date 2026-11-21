import Link from "next/link";

export default function NotFound() {
  return (
    <div className="centered-state">
      <h1>Esse caminho ficou para trás.</h1>
      <p>Volte para o seu espaço e continue de onde parou.</p>
      <Link className="button primary" href="/tarefas">
        Ir para minhas tarefas
      </Link>
    </div>
  );
}
