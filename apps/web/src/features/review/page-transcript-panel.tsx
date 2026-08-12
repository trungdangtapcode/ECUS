import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { read, reviewKey } from "./queries";

export function PageTranscriptPanel({
  caseId,
  data,
  documentId,
  page,
}: {
  caseId: string;
  data: ReviewWorkspace;
  documentId: string;
  page: number;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const document = data.workspace.documents?.find((item) => item.id === documentId);
  const mutation = useMutation({
    mutationFn: async () =>
      read(
        await api.POST("/api/v1/cases/{case_id}/review/documents/{document_id}/transcript", {
          params: { path: { case_id: caseId, document_id: documentId } },
          body: { revision: data.workspace.revision, page, text, reason },
        }),
      ),
    onSuccess: (result) => {
      cache.setQueryData(reviewKey(caseId), result);
      setText("");
      setReason("");
    },
  });
  if (document?.ocr_pages?.[page]?.is_blank) {
    return <p className="review-comparison">{t("integration.blankPageNotice")}</p>;
  }
  if (document?.pages[page - 1]?.trim()) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <details className="review-comparison">
      <summary>{t("integration.transcriptTitle")}</summary>
      <p>{t("integration.transcriptNotice")}</p>
      {document?.transcripts?.[page] && <p>{t("integration.transcriptSaved")}</p>}
      <form className="review-form" onSubmit={submit}>
        <label>
          {t("integration.transcriptText")}
          <textarea
            required
            maxLength={100000}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label>
          {t("integration.editReason")}
          <input
            required
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {mutation.error && <ErrorState error={mutation.error} />}
        <Button type="submit" disabled={mutation.isPending || !text.trim() || !reason.trim()}>
          {t("integration.saveTranscript")}
        </Button>
      </form>
    </details>
  );
}
