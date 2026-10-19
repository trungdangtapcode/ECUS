import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMotionRecipe } from "../../design/motion-hooks";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { profilesQuery, useCreateCase } from "./queries";
import { useDesign } from "../../design/context";

export function CreateCaseDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { path } = useDesign();
  const dialog = useRef<HTMLDialogElement>(null);
  const effects = useMotionRecipe();
  const referenceInput = useRef<HTMLInputElement>(null);
  const profiles = useQuery(profilesQuery);
  const [procedure, setProcedure] = useState<string | null>(null);
  const selectedProcedure =
    procedure ?? profiles.data?.find((profile) => profile.is_default)?.code ?? "";
  const mutation = useCreateCase();
  const navigate = useNavigate();

  useEffect(() => {
    dialog.current?.showModal();
    referenceInput.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate(
      {
        reference: String(data.get("reference")).trim(),
        title: String(data.get("title")).trim(),
        procedure: String(data.get("procedure")),
      },
      {
        onSuccess: (saved) => {
          onClose();
          void navigate(path(`/cases/${saved.id}`));
        },
      },
    );
  }

  return (
    <motion.dialog
      ref={dialog}
      className="case-dialog"
      onCancel={onClose}
      aria-labelledby="create-title"
      {...effects.reveal()}
    >
      <div className="dialog-heading">
        <div>
          <h2 id="create-title">{t("cases.formTitle")}</h2>
          <p>{t("cases.formDescription")}</p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label={t("common.close")}>
          <X size={20} />
        </Button>
      </div>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="case-reference">{t("cases.reference")}</label>
          <input
            id="case-reference"
            ref={referenceInput}
            name="reference"
            required
            maxLength={40}
            pattern="[A-Za-z0-9][A-Za-z0-9.\/_\-]*"
            placeholder={t("cases.referencePlaceholder")}
            aria-describedby="reference-hint"
          />
          <small id="reference-hint">{t("cases.referenceHint")}</small>
        </div>
        <label className="field">
          {t("cases.name")}
          <input name="title" required maxLength={200} placeholder={t("cases.namePlaceholder")} />
        </label>
        <label className="field">
          {t("cases.procedure")}
          <select
            name="procedure"
            required
            value={selectedProcedure}
            onChange={(event) => setProcedure(event.target.value)}
            disabled={!profiles.data?.length}
          >
            <option value="" disabled>
              {t("cases.selectProfile")}
            </option>
            {profiles.data?.map((profile) => (
              <option key={profile.code} value={profile.code}>
                {profile.code} — {t(`procedures.${profile.code}`, { defaultValue: profile.name })}
              </option>
            ))}
          </select>
        </label>
        {profiles.isPending && <p role="status">{t("common.loading")}</p>}
        {profiles.data?.length === 0 && <p>{t("cases.noProfiles")}</p>}
        {profiles.isError && (
          <ErrorState error={profiles.error} onRetry={() => void profiles.refetch()} />
        )}
        {mutation.isError && <ErrorState error={mutation.error} />}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending || !profiles.data?.length}>
            {t(mutation.isPending ? "cases.saving" : "cases.submit")}
          </Button>
        </div>
      </form>
    </motion.dialog>
  );
}
