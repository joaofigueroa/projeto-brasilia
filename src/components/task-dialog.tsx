"use client";
import {
  CalendarDays,
  Check,
  Clock3,
  FileText,
  History,
  LockKeyhole,
  Paperclip,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { useTaskForm } from "@/hooks/use-task-form";
import { priorityLabels, statuses, statusLabels } from "@/libs/presentation";
import type { BoardData, Task, TaskStatus } from "@/types/domain";
import { Avatar } from "./avatar";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { Dialog } from "./dialog";
import { FormError, SubmitButton } from "./feedback";
import { TaskHistoryPanel } from "./task-history";

export function TaskDialog({
  data,
  task,
  initialStatus = "open",
  onClose,
  onSaved,
  onDeleted,
  onMove,
}: {
  data: BoardData;
  task: Task | null;
  initialStatus?: TaskStatus;
  onClose: () => void;
  onSaved: (week: string) => void;
  onDeleted: () => void;
  onMove: (task: Task, status: TaskStatus) => void;
}) {
  const [tab, setTab] = useState<"details" | "history">("details");
  const tabId = useId();
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const { submit, pending, error } = useTaskForm(task, onSaved);
  const editable = task ? task.canEdit : true;
  return (
    <>
      <Dialog
        title={task ? "Detalhes da tarefa" : "Nova tarefa"}
        eyebrow={task ? "DETALHES DA TAREFA" : "NOVA TAREFA"}
        onClose={onClose}
      >
        {task && (
          <div className="dialog-tabs" role="tablist" aria-label="Informações da tarefa">
            {[
              { id: "details", label: "Detalhes", Icon: FileText },
              { id: "history", label: "Histórico", Icon: History },
            ].map(({ id, label, Icon }) => (
              <button
                type="button"
                key={id}
                role="tab"
                aria-selected={tab === id}
                aria-controls={`${tabId}-${id}`}
                id={`${tabId}-tab-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id as typeof tab)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "details"
                      : event.key === "End"
                        ? "history"
                        : tab === "details"
                          ? "history"
                          : "details";
                  setTab(next);
                  document.getElementById(`${tabId}-tab-${next}`)?.focus();
                }}
                className={tab === id ? "active" : ""}
              >
                <Icon size={16} />
                {label}
                {id === "history" && (
                  <span className="tab-count">
                    {data.history.length}
                    {data.hasOlderHistory ? "+" : ""}
                  </span>
                )}
                {tab === id && <motion.span className="tab-underline" layoutId="task-tab" />}
              </button>
            ))}
          </div>
        )}
        <div className="dialog-scroll">
          <motion.div
            id={`${tabId}-details`}
            role={task ? "tabpanel" : undefined}
            aria-labelledby={task ? `${tabId}-tab-details` : undefined}
            animate={{ opacity: tab === "details" ? 1 : 0, height: tab === "details" ? "auto" : 0 }}
            style={{ overflow: "hidden" }}
            inert={tab !== "details"}
          >
            <form onSubmit={submit} className="task-form">
              {!editable && (
                <div className="access-note">
                  <LockKeyhole size={17} />
                  <span>
                    Este card é administrado por{" "}
                    {data.users.find((user) => user.id === task?.administratorId)?.name}. Você pode
                    consultar os detalhes e o histórico.
                  </span>
                </div>
              )}
              <fieldset disabled={!editable || pending}>
                <label className="field">
                  <span>Título da tarefa</span>
                  <input
                    name="title"
                    className="task-title-input"
                    placeholder="O que vamos fazer?"
                    defaultValue={task?.title}
                    minLength={3}
                    maxLength={160}
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Descrição <small>opcional</small>
                  </span>
                  <textarea
                    name="description"
                    placeholder="Descreva a tarefa…"
                    defaultValue={task?.description}
                    rows={5}
                    maxLength={10000}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Projeto</span>
                    <div className="select-wrap">
                      <select
                        name="projectId"
                        defaultValue={task?.projectId ?? data.projectId ?? data.projects[0]?.id}
                        required
                      >
                        {data.projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label className="field">
                    <span>Prioridade</span>
                    <div className="select-wrap">
                      <select name="priority" defaultValue={task?.priority ?? "medium"}>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>
                      <CalendarDays size={15} />
                      Semana
                    </span>
                    <input
                      name="weekStart"
                      type="date"
                      min="1970-01-05"
                      step={7}
                      defaultValue={task?.weekStart ?? data.weekStart}
                      required
                    />
                    <small>Selecione a segunda-feira.</small>
                  </label>
                  <label className="field">
                    <span>
                      <Clock3 size={15} />
                      Prazo <small>opcional</small>
                    </span>
                    <input type="date" name="dueDate" defaultValue={task?.dueDate ?? ""} />
                  </label>
                </div>
                <label className="field">
                  <span>Status</span>
                  <div className="select-wrap">
                    <select name="status" defaultValue={task?.status ?? initialStatus}>
                      {statuses.map((status) => (
                        <option value={status} key={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <div className="field">
                  <span className="field-label">
                    <Users size={15} />
                    Responsáveis
                  </span>
                  <div className="assignee-options">
                    {data.users.map((user) => (
                      <label key={user.id} className="assignee-option">
                        <input
                          type="checkbox"
                          name="assigneeIds"
                          value={user.id}
                          defaultChecked={
                            task ? task.assigneeIds.includes(user.id) : user.id === data.viewer.id
                          }
                        />
                        <Avatar user={user} size="sm" />
                        <span>{user.name}</span>
                        <Check size={15} className="assignee-check" />
                      </label>
                    ))}
                  </div>
                  <small>Selecione uma ou mais pessoas responsáveis.</small>
                </div>
                <label className="field">
                  <span>
                    <ShieldCheck size={15} />
                    Administrador do card
                  </span>
                  <div className="select-wrap">
                    <select
                      name="administratorId"
                      defaultValue={task?.administratorId ?? data.viewer.id}
                    >
                      {data.users
                        .filter(
                          (user) =>
                            task || data.viewer.role === "admin" || user.id === data.viewer.id,
                        )
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <small>Quem pode editar os dados e os responsáveis desta tarefa.</small>
                </label>
              </fieldset>
              {task && !editable && task.canMove && (
                <label className="field">
                  <span>Movimentar tarefa</span>
                  <div className="select-wrap">
                    <select
                      aria-label="Movimentar tarefa"
                      value={task.status}
                      onChange={(event) => onMove(task, event.target.value as TaskStatus)}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              )}
              {task?.canMove && (
                <button
                  type="button"
                  className="button secondary task-attachment-shortcut"
                  onClick={() => {
                    setTab("history");
                    document.getElementById(`${tabId}-tab-history`)?.focus();
                  }}
                >
                  <Paperclip size={15} />
                  Anexos da tarefa
                </button>
              )}
              <FormError message={error} />
              <div className="dialog-form-footer">
                {task && editable ? (
                  <button
                    type="button"
                    className="task-delete-trigger"
                    disabled={pending}
                    onClick={() => setConfirmDeleting(true)}
                  >
                    <Trash2 size={15} />
                    Excluir tarefa
                  </button>
                ) : (
                  <span>
                    <ShieldCheck size={14} />
                    Alterações ficam no histórico.
                  </span>
                )}
                {editable ? (
                  <SubmitButton pending={pending}>
                    {task ? "Salvar alterações" : "Criar tarefa"}
                  </SubmitButton>
                ) : (
                  <button type="button" className="button secondary" onClick={onClose}>
                    Fechar detalhes
                  </button>
                )}
              </div>
            </form>
          </motion.div>
          {task && (
            <motion.div
              id={`${tabId}-history`}
              role="tabpanel"
              aria-labelledby={`${tabId}-tab-history`}
              animate={{
                opacity: tab === "history" ? 1 : 0,
                height: tab === "history" ? "auto" : 0,
              }}
              style={{ overflow: "hidden" }}
              inert={tab !== "history"}
            >
              <TaskHistoryPanel data={data} task={task} />
            </motion.div>
          )}
        </div>
      </Dialog>
      <AnimatePresence>
        {confirmDeleting && task && (
          <DeleteTaskDialog
            task={task}
            onCancel={() => setConfirmDeleting(false)}
            onDeleted={onDeleted}
          />
        )}
      </AnimatePresence>
    </>
  );
}
