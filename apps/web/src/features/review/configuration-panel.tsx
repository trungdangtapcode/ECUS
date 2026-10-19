import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ReviewPolicy, type ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { useFieldLabel } from "./field-label";
import { encodeFile, read, reviewKey, reviewFileUrl } from "./queries";

export function ConfigurationPanel({ caseId, data }: { caseId: string; data: ReviewWorkspace }) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const fieldLabel = useFieldLabel(data);
  const { workspace } = data;
  const { revision, policy } = workspace;
  const path = { case_id: caseId };
  const [reason, setReason] = useState("");
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const documents = workspace.documents ?? [];
  const active = documents.filter((item) => !item.withdrawn);
  const selected = active.find((item) => item.id === documentId) ?? active[0];
  const mutation = useMutation({
    mutationFn: (action: () => Promise<ReviewWorkspace>) => action(),
    onSuccess: (result) => cache.setQueryData(reviewKey(caseId), result),
  });
  const run = mutation.mutate;
  const body = { revision, reason };
  const kinds = [
    ...new Set([
      ...(policy?.required_documents ?? []),
      ...(policy?.document_requirements ?? []).flatMap((rule) => rule.any_of),
      ...(policy?.fields ?? []).flatMap((rule) => rule.preferred_sources ?? []),
    ]),
  ];
  return (
    <section className="register review-section">
      <h2>{t("rules.title")}</h2>
      <p className="info-note">{t("rules.scope")}</p>
      {mutation.isError && <ErrorState error={mutation.error} />}
      <fieldset className="review-controls review-settings-stack" disabled={mutation.isPending}>
        <label>
          {t("review.reason")}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={2000}
          />
        </label>
        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (policyFile)
              run(async () => {
                let policy: ReviewPolicy;
                try {
                  policy = JSON.parse(await policyFile.text()) as ReviewPolicy;
                } catch {
                  throw new ApiError({ error: { code: "invalid_policy" } });
                }
                return read(
                  await api.POST("/api/v1/cases/{case_id}/review/policy", {
                    params: { path },
                    body: { ...body, policy },
                  }),
                );
              });
          }}
        >
          <label>
            {t("rules.file")}
            <input
              type="file"
              accept=".json,application/json"
              required
              onChange={(event) => setPolicyFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <Button type="submit" disabled={!reason.trim() || !policyFile}>
            {t("rules.adopt")}
          </Button>
        </form>
        {policy ? (
          <>
            <h3>
              {t(policy.name, { defaultValue: policy.name })} · {policy.version}
            </h3>
            <p>{t(`rules.${policy.status ?? "proposal"}`)}</p>
            {!policy.fields?.length && (
              <p role="status">{t("review.blockers.fields_unconfigured")}</p>
            )}
            <label>
              {t("rules.stage")}
              <select
                value={workspace.stage ?? "pre_arrival"}
                disabled={!reason.trim()}
                onChange={(event) => {
                  const stage = event.currentTarget.value as "pre_arrival" | "arrival_confirmed";
                  run(async () =>
                    read(
                      await api.POST("/api/v1/cases/{case_id}/review/stage", {
                        params: { path },
                        body: { ...body, stage },
                      }),
                    ),
                  );
                }}
              >
                <option value="pre_arrival">{t("rules.pre_arrival")}</option>
                <option value="arrival_confirmed">{t("rules.arrival_confirmed")}</option>
              </select>
            </label>
            {(policy.document_requirements ?? []).map((rule) => (
              <article key={rule.key} className="review-comparison">
                <h4>{rule.label}</h4>
                <p>
                  {rule.any_of.join(" / ")} · {t(`rules.when.${rule.when ?? "always"}`)}
                </p>
                {rule.when === "applicable" && (
                  <label>
                    {t("rules.applicability")}
                    <select
                      aria-label={`${t("rules.applicability")} ${rule.label}`}
                      value={workspace.applicability?.[rule.key]?.status ?? "unknown"}
                      disabled={!reason.trim()}
                      onChange={(event) => {
                        const status = event.currentTarget.value as
                          "unknown" | "applicable" | "not_applicable";
                        run(async () =>
                          read(
                            await api.POST("/api/v1/cases/{case_id}/review/applicability/{key}", {
                              params: { path: { ...path, key: rule.key } },
                              body: { ...body, status },
                            }),
                          ),
                        );
                      }}
                    >
                      {(["unknown", "applicable", "not_applicable"] as const).map((status) => (
                        <option key={status} value={status}>
                          {t(`rules.${status}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </article>
            ))}
            <div className="review-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("review.field")}</th>
                    <th>{t("review.type")}</th>
                    <th>{t("rules.preferred")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(policy.fields ?? []).map((field) => (
                    <tr key={field.field}>
                      <td>
                        {fieldLabel(field.field)} ({field.field}) {field.required !== false && "*"}
                      </td>
                      <td>
                        {t(`review.${field.value_type ?? "text"}`)} {field.unit}
                      </td>
                      <td>{field.preferred_sources?.join(" / ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>{t("rules.none")}</p>
        )}
        <h3>{t("rules.classification")}</h3>
        <p>{t("rules.combined")}</p>
        {selected && (
          <form
            className="review-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () =>
                read(
                  await api.POST("/api/v1/cases/{case_id}/review/logical-documents", {
                    params: { path },
                    body: {
                      ...body,
                      document_id: selected.id,
                      document_type: documentType,
                      page_from: from,
                      page_to: to,
                    },
                  }),
                ),
              );
            }}
          >
            <label>
              {t("review.document")}
              <select
                value={selected.id}
                onChange={(event) => {
                  setDocumentId(event.target.value);
                  setFrom(1);
                  setTo(1);
                }}
              >
                {active.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("review.logicalType")}
              <input
                required
                maxLength={80}
                value={documentType}
                list="document-kinds"
                onChange={(event) => setDocumentType(event.target.value)}
              />
            </label>
            <datalist id="document-kinds">
              {kinds.map((kind) => (
                <option key={kind} value={kind} />
              ))}
            </datalist>
            <div className="review-form-grid">
              <label>
                {t("rules.from")}
                <input
                  type="number"
                  min={1}
                  max={selected.pages.length}
                  value={from}
                  required
                  onChange={(event) => setFrom(Number(event.target.value))}
                />
              </label>
              <label>
                {t("rules.to")}
                <input
                  type="number"
                  min={from}
                  max={selected.pages.length}
                  value={to}
                  required
                  onChange={(event) => setTo(Number(event.target.value))}
                />
              </label>
            </div>
            <Button type="submit" disabled={!reason.trim()}>
              {t("rules.classify")}
            </Button>
          </form>
        )}
        {(workspace.logical_documents ?? [])
          .filter((item) => !item.withdrawn && active.some((doc) => doc.id === item.document_id))
          .map((item) => (
            <div className="review-export-record" key={item.id}>
              <span>
                {documents.find((doc) => doc.id === item.document_id)?.filename} ·{" "}
                {item.document_type} · {item.page_from}–{item.page_to}
              </span>
              <Button
                variant="ghost"
                disabled={!reason.trim()}
                onClick={() =>
                  run(async () =>
                    read(
                      await api.POST(
                        "/api/v1/cases/{case_id}/review/logical-documents/{logical_id}/withdraw",
                        { params: { path: { ...path, logical_id: item.id } }, body },
                      ),
                    ),
                  )
                }
              >
                {t("rules.withdraw")}
              </Button>
            </div>
          ))}
        <h3>{t("rules.documentHistory")}</h3>
        {documents.map((doc) => (
          <article className="review-comparison" key={doc.id}>
            <a href={reviewFileUrl(caseId, "documents", doc.id)} target="_blank" rel="noreferrer">
              {doc.filename}
            </a>
            {doc.withdrawn ? (
              <p>
                {t("rules.withdrawn")} · {doc.withdrawal_reason}
              </p>
            ) : (
              <div className="review-actions">
                <Button
                  variant="secondary"
                  disabled={!reason.trim()}
                  onClick={() =>
                    run(async () =>
                      read(
                        await api.POST(
                          "/api/v1/cases/{case_id}/review/documents/{document_id}/withdraw",
                          { params: { path: { ...path, document_id: doc.id } }, body },
                        ),
                      ),
                    )
                  }
                >
                  {t("rules.withdraw")}
                </Button>
                <label>
                  {t("rules.replace")}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={!reason.trim()}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file)
                        run(async () =>
                          read(
                            await api.POST(
                              "/api/v1/cases/{case_id}/review/documents/{document_id}/replace",
                              {
                                params: { path: { ...path, document_id: doc.id } },
                                body: {
                                  ...body,
                                  filename: file.name,
                                  content_base64: await encodeFile(file),
                                },
                              },
                            ),
                          ),
                        );
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </article>
        ))}
      </fieldset>
    </section>
  );
}
