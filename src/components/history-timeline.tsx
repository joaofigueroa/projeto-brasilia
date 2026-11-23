import { timestampLabel } from "@/libs/presentation";
import type { Change, PublicUser } from "@/types/domain";
import { Avatar } from "./avatar";
export type HistoryTimelineEntry = {
  id: string;
  actor: Pick<PublicUser, "id" | "name" | "image">;
  createdAt: string;
  label: string;
  changes: Change[];
  body?: string;
};
export function HistoryTimeline({
  entries,
  fieldLabels = {},
}: {
  entries: HistoryTimelineEntry[];
  fieldLabels?: Record<string, string>;
}) {
  return (
    <ol className="history-list">
      {entries.map((entry) => (
        <li key={entry.id} className="history-event">
          <div className="history-avatar">
            <Avatar user={entry.actor} size="sm" />
          </div>
          <div className="history-event-content">
            <p>
              <strong>{entry.actor.name}</strong> {entry.label}
            </p>
            <time dateTime={entry.createdAt}>{timestampLabel(entry.createdAt)}</time>
            {entry.body && <p className="history-comment">{entry.body}</p>}
            {entry.changes.length > 0 && (
              <div className="history-changes">
                {entry.changes.map((change) => (
                  <div key={change.field}>
                    <strong>{fieldLabels[change.field] ?? change.field}</strong>
                    <span className="history-before">{change.before}</span>
                    <span className="history-after">{change.after}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
