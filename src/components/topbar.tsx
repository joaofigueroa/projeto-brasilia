import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDay, todayInSaoPaulo } from "@/libs/calendar";
import type { PublicUser } from "@/types/domain";
import { Avatar } from "./avatar";

export function Topbar({ title, viewer }: { title: string; viewer: PublicUser }) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Espaço de trabalho</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="topbar-right">
        <span className="today-label">
          <CalendarDays size={16} />
          {formatDay(todayInSaoPaulo(), { day: "numeric", month: "long" })}
        </span>
        <span className="topbar-divider" />
        <Link href="/perfil" aria-label="Abrir meu perfil">
          <Avatar user={viewer} size="sm" />
        </Link>
      </div>
    </header>
  );
}
