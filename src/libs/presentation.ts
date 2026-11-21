import type { Priority, TaskStatus } from "@/types/domain";

export const statusLabels: Record<TaskStatus, string> = {
  open: "Em aberto",
  in_progress: "Em andamento",
  done: "Finalizadas",
};
export const priorityLabels: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};
export const statuses: TaskStatus[] = ["open", "in_progress", "done"];

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function avatarColor(name: string) {
  return ["lilac", "peach", "sage", "blue", "rose"][
    Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5
  ];
}

export function timestampLabel(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
