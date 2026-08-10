import type { ReviewWorkspace } from "@ecus/api-client";

export function workflowStatus(data?: ReviewWorkspace): string {
  if (!data) return "loading";
  if (data.readiness.approved)
    return data.workspace.exports?.some((item) => item.kind !== "draft") ? "exported" : "approved";
  if (data.readiness.eligible) return "ready";
  if (data.workspace.documents?.some((document) => !document.withdrawn)) return "review";
  return "draft";
}
