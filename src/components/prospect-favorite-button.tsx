"use client";
import { LoaderCircle, Star } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { favoriteProspectAction } from "@/server/actions/prospect-favorites";
import { Toast } from "./feedback";
export function ProspectFavoriteButton({
  projectId,
  prospectId,
  name,
  initialFavorite = false,
  compact = false,
}: {
  projectId: string;
  prospectId: string;
  name: string;
  initialFavorite?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function update() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await favoriteProspectAction({ projectId, prospectId, favorite: !favorite });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setFavorite(result.data.favorite);
      router.refresh();
    } catch {
      setError("Não foi possível atualizar seus favoritos. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <button
        className={`prospect-favorite ${compact ? "compact" : "button secondary"}`}
        type="button"
        aria-label={favorite ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
        aria-pressed={favorite}
        aria-busy={pending}
        disabled={pending}
        onClick={update}
        title={favorite ? "Remover dos favoritos" : "Favoritar cliente"}
      >
        {pending ? (
          <LoaderCircle size={16} className="spinner" aria-hidden="true" />
        ) : (
          <Star size={16} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
        )}
        {!compact && (favorite ? "Favoritado" : "Favoritar")}
      </button>
      <AnimatePresence>
        {error && <Toast message={error} onClose={() => setError("")} />}
      </AnimatePresence>
    </>
  );
}
