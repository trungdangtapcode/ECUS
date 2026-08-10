import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, type ReviewWorkspace } from "@ecus/api-client";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Layers } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { read, reviewKey } from "./queries";

export function TemplateProfilePanel({ caseId, data }: { caseId: string; data: ReviewWorkspace }) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const [profileId, setProfileId] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [adoptRules, setAdoptRules] = useState(false);
  const profiles = useQuery({
    queryKey: ["excel-template-profiles"],
    queryFn: async ({ signal }) => {
      const result = await api.GET("/api/v1/reference/excel-templates", { signal });
      if (result.error || !result.data) throw new ApiError(result.error);
      return result.data;
    },
  });
  const profile =
    profiles.data?.find((item) => item.id === (profileId || data.workspace.template?.profile_id)) ??
    profiles.data?.[0];
  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new ApiError(undefined);
      return read(
        await api.POST("/api/v1/cases/{case_id}/review/template-profile", {
          params: { path: { case_id: caseId } },
          body: {
            revision: data.workspace.revision,
            profile_id: profile.id,
            counts: Object.fromEntries(
              Object.keys(profile.groups).map((key) => [
                key,
                counts[key] ?? data.workspace.template?.repeat_counts?.[key] ?? 1,
              ]),
            ),
            reason,
            adopt_profile_rules: adoptRules,
          },
        }),
      );
    },
    onSuccess: (result) => {
      cache.setQueryData(reviewKey(caseId), result);
      setReason("");
      setAdoptRules(false);
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <section className="template-profile-panel" aria-label={t("integration.templateLibrary")}>
      <header>
        <FileSpreadsheet size={23} />
        <div>
          <h2>{t("integration.templateLibrary")}</h2>
          <p>{t("integration.templateNotice")}</p>
        </div>
        <Layers className="template-profile-watermark" size={86} aria-hidden="true" />
      </header>
      {profiles.isPending && <p role="status">{t("common.loading")}</p>}
      {profiles.error && (
        <ErrorState error={profiles.error} onRetry={() => void profiles.refetch()} />
      )}
      {profiles.data?.length === 0 && <p>{t("integration.noProfiles")}</p>}
      {profile && (
        <form className="review-form" onSubmit={submit}>
          <div className="review-form-grid">
            <label>
              {t("integration.profile")}
              <select
                value={profile.id}
                onChange={(event) => {
                  setProfileId(event.target.value);
                  setCounts({});
                }}
              >
                {profiles.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(item.name_key, { defaultValue: item.id })} · {item.version}
                  </option>
                ))}
              </select>
            </label>
            {Object.entries(profile.groups).map(([key, maximum]) => (
              <label key={key}>
                {t(`integration.groups.${key}`, { defaultValue: key })}
                <input
                  type="number"
                  min={0}
                  max={maximum}
                  required
                  value={counts[key] ?? data.workspace.template?.repeat_counts?.[key] ?? 1}
                  onChange={(event) =>
                    setCounts((current) => ({ ...current, [key]: Number(event.target.value) }))
                  }
                />
              </label>
            ))}
          </div>
          <label>
            {t("integration.setupReason")}
            <input
              required
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {data.workspace.template && (
            <label className="review-check">
              <input
                type="checkbox"
                checked={adoptRules}
                onChange={(event) => setAdoptRules(event.target.checked)}
              />
              {t("integration.adoptProfileRules")}
            </label>
          )}
          {mutation.error && <ErrorState error={mutation.error} />}
          <Button type="submit" disabled={mutation.isPending || !reason.trim()}>
            {t(
              data.workspace.template?.profile_id
                ? "integration.updateProfile"
                : "integration.applyProfile",
            )}
          </Button>
        </form>
      )}
    </section>
  );
}
