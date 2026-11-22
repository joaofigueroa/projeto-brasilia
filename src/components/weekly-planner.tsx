import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDay, mondayOf, todayInSaoPaulo, weekLabel } from "@/libs/calendar";
import type { BoardData, Task } from "@/types/domain";
export function WeeklyPlanner({
  data,
  tasks,
  activeDay,
  navigating,
  onDay,
  onWeek,
}: {
  data: BoardData;
  tasks: Task[];
  activeDay: string | null;
  navigating: boolean;
  onDay: (day: string | null) => void;
  onWeek: (week: string) => void;
}) {
  const currentWeek = mondayOf(todayInSaoPaulo());
  return (
    <section className="planning-week" aria-label="Planejamento da semana">
      <div className="planning-week-heading">
        <div className="planning-date">
          <span className="section-caption">
            Semana de {formatDay(data.weekStart, { month: "long", year: "numeric" })}
          </span>
          <div className="week-controls">
            <label className="week-picker">
              <strong>{weekLabel(data.weekStart)}</strong>
              <input
                type="date"
                min="1970-01-05"
                step={7}
                aria-label="Selecionar semana"
                value={data.weekStart}
                disabled={navigating}
                onChange={(event) => {
                  if (event.target.value) onWeek(mondayOf(event.target.value));
                }}
              />
              <ChevronDown size={16} />
            </label>
            <button
              className="icon-button"
              type="button"
              aria-label="Semana anterior"
              disabled={navigating}
              onClick={() => onWeek(addDays(data.weekStart, -7))}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Próxima semana"
              disabled={navigating}
              onClick={() => onWeek(addDays(data.weekStart, 7))}
            >
              <ChevronRight size={17} />
            </button>
            <button
              className={`today-button ${data.weekStart === currentWeek ? "current" : ""}`}
              type="button"
              disabled={navigating}
              onClick={() => onWeek(currentWeek)}
            >
              Hoje
            </button>
          </div>
        </div>
        <div
          className="week-completion"
          role="group"
          aria-label={`${data.stats.done} de ${data.stats.total} tarefas concluídas na semana`}
        >
          <span className="completion-number">
            {data.stats.completion}
            <small>%</small>
          </span>
          <div>
            <span className="section-caption">Conclusão da semana</span>
            <p>
              {data.stats.done} de {data.stats.total} tarefas
            </p>
            <div className="completion-track">
              <span style={{ transform: `scaleX(${data.stats.completion / 100})` }} />
            </div>
          </div>
        </div>
      </div>
      <div className="week-agenda" role="group" aria-label="Filtrar tarefas pelo dia do prazo">
        {Array.from({ length: 7 }, (_, index) => {
          const day = addDays(data.weekStart, index);
          const count = tasks.filter((task) => task.dueDate === day).length;
          return (
            <button
              type="button"
              key={day}
              className={`agenda-day ${day === todayInSaoPaulo() ? "is-today" : ""} ${count ? "has-deadline" : ""}`}
              aria-pressed={activeDay === day}
              aria-label={`Prazo em ${formatDay(day, { day: "numeric", month: "long" })}, ${count} ${count === 1 ? "tarefa" : "tarefas"}`}
              onClick={() => onDay(activeDay === day ? null : day)}
            >
              <span className="agenda-weekday">
                {formatDay(day, { weekday: "short" }).replace(".", "")}
              </span>
              <strong>{formatDay(day, { day: "2-digit" })}</strong>
              <span className="agenda-count">
                {count ? `${count} ${count === 1 ? "prazo" : "prazos"}` : "Sem prazos"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
