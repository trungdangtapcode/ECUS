import { ApiError } from "@ecus/api-client";
import type {
  ReviewObservationInput,
  ReviewCorrectionInput,
  ReviewTemplateInput,
  ReviewWorkspace,
} from "@ecus/api-client";
import { queryOptions } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const reviewKey = (caseId: string) => ["review", caseId] as const;
export function read(result: { data?: ReviewWorkspace; error?: unknown }): ReviewWorkspace {
  if (result.error || !result.data) throw new ApiError(result.error);
  return result.data;
}
export const reviewQuery = (caseId: string) =>
  queryOptions({
    queryKey: reviewKey(caseId),
    queryFn: async ({ signal }) =>
      read(
        await api.GET("/api/v1/cases/{case_id}/review", {
          params: { path: { case_id: caseId } },
          signal,
        }),
      ),
  });
export const reviewActions = {
  correct: async (caseId: string, observationId: string, body: ReviewCorrectionInput) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/observations/{observation_id}/correct", {
        params: { path: { case_id: caseId, observation_id: observationId } },
        body,
      }),
    ),
  withdraw: async (caseId: string, observationId: string, revision: number, reason: string) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/observations/{observation_id}/withdraw", {
        params: { path: { case_id: caseId, observation_id: observationId } },
        body: { revision, reason },
      }),
    ),
  upload: async (caseId: string, revision: number, filename: string, content_base64: string) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/documents", {
        params: { path: { case_id: caseId } },
        body: { revision, filename, content_base64 },
      }),
    ),
  observe: async (caseId: string, body: ReviewObservationInput) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/observations", {
        params: { path: { case_id: caseId } },
        body,
      }),
    ),
  verify: async (caseId: string, observationId: string, revision: number, reason: string) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/observations/{observation_id}/verify", {
        params: { path: { case_id: caseId, observation_id: observationId } },
        body: { revision, reason },
      }),
    ),
  select: async (
    caseId: string,
    field: string,
    observation_id: string,
    revision: number,
    reason: string,
  ) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/fields/{field}/selection", {
        params: { path: { case_id: caseId, field } },
        body: { revision, observation_id, reason },
      }),
    ),
  template: async (caseId: string, body: ReviewTemplateInput) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/template", {
        params: { path: { case_id: caseId } },
        body,
      }),
    ),
  approve: async (caseId: string, revision: number, reason: string) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/approve", {
        params: { path: { case_id: caseId } },
        body: { revision, reason },
      }),
    ),
  export: async (caseId: string, revision: number) =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/exports", {
        params: { path: { case_id: caseId } },
        body: { revision },
      }),
    ),
  draftExport: async (caseId: string, revision: number, reason: string, locale: "en" | "vi") =>
    read(
      await api.POST("/api/v1/cases/{case_id}/review/draft-exports", {
        params: { path: { case_id: caseId } },
        body: { revision, reason, locale },
      }),
    ),
};

export async function encodeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File could not be read"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function reviewFileUrl(caseId: string, kind: "documents" | "exports", id: string): string {
  return `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/cases/${encodeURIComponent(caseId)}/review/${kind}/${encodeURIComponent(id)}/content`;
}
