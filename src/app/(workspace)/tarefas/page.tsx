import type { Metadata } from "next";
import { Kanban } from "@/components/kanban";
import { Topbar } from "@/components/topbar";
import { mondayOf, todayInSaoPaulo } from "@/libs/calendar";
import { getBoard } from "@/server/services/tasks";
import { boardFiltersSchema } from "@/validators";

export const metadata: Metadata = { title: "Tarefas" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = {
    week: params.week ?? mondayOf(todayInSaoPaulo()),
    project: params.project,
    assignee: params.assignee,
    q: params.q,
    task: params.task,
  };
  const parsed = boardFiltersSchema.safeParse(raw);
  const input = parsed.success ? parsed.data : { week: mondayOf(todayInSaoPaulo()), q: "" };
  const data = await getBoard(input);
  return (
    <>
      <Topbar title="Tarefas" viewer={data.viewer} />
      <Kanban data={data} />
    </>
  );
}
