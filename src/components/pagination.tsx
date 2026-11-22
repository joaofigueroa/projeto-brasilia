"use client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
export function Pagination({
  label,
  total,
  page,
  pageSize,
  pages,
  start,
  end,
  onPageChange,
  onPageSizeChange,
  pending = false,
  targetId,
}: {
  label: string;
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pending?: boolean;
  targetId?: string;
}) {
  function changePage(next: number) {
    onPageChange(next);
    if (targetId)
      requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        });
      });
  }
  return (
    <nav className="data-pagination" aria-label={`Paginação de ${label}`}>
      <span aria-live="polite">
        {start}–{end} de {total.toLocaleString("pt-BR")}
      </span>
      <label>
        Por página
        <select
          aria-label={`Itens por página de ${label}`}
          value={pageSize}
          disabled={pending}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button
          className="icon-button"
          type="button"
          aria-label={`Primeira página de ${label}`}
          disabled={pending || page === 1}
          onClick={() => changePage(1)}
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={`Página anterior de ${label}`}
          disabled={pending || page === 1}
          onClick={() => changePage(page - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <span>
          Página {page} de {pages}
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label={`Próxima página de ${label}`}
          disabled={pending || page >= pages}
          onClick={() => changePage(page + 1)}
        >
          <ChevronRight size={15} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={`Última página de ${label}`}
          disabled={pending || page >= pages}
          onClick={() => changePage(pages)}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </nav>
  );
}
