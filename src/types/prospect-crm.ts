import type { CrmStage } from "@/libs/prospect-crm";
import type { Change, PublicUser } from "./domain";
export type CrmEvent = {
  id: string;
  kind: "created" | "stage_changed" | "comment" | "attachment_added";
  actor: Pick<PublicUser, "id" | "name" | "image">;
  createdAt: string;
  changes: Change[];
  body: string;
};
export type CrmAttachment = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
  uploadedBy: string;
};
export type CrmHistoryPage = {
  entries: CrmEvent[];
  nextCursor: { createdAt: string; id: string } | null;
};
export type ProspectCrm = {
  stage: CrmStage;
  version: number;
  canManage: boolean;
  storageConfigured: boolean;
  history: CrmHistoryPage;
  attachments: { items: CrmAttachment[]; total: number; page: number; pages: number };
};
