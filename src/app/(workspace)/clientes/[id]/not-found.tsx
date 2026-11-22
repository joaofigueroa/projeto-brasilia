import Link from "next/link";
export default function ProspectNotFound() {
  return (
    <div className="page-content bi-empty">
      <h1>Perfil não encontrado</h1>
      <p>Este cliente não está disponível no projeto selecionado.</p>
      <Link className="button secondary" href="/inteligencia">
        Voltar à pesquisa
      </Link>
    </div>
  );
}
