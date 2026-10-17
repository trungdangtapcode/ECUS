import { useEffect, useRef, useState } from "react";
import type { CaseRead } from "@ecus/api-client";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/error-state";
import { useDeleteCase, useSetCaseArchived } from "./queries";
import { useDesign } from "../../design/context";

export function CaseActions({ item }: { item: CaseRead }) {
  const { t } = useTranslation();
  const mutation = useSetCaseArchived(item.id);
  const [deleting, setDeleting] = useState(false);
  const archived = !!item.archived_at;
  return (
    <section className="case-lifecycle" aria-label={t("cases.manage")}>
      <div>
        <h2>{t(archived ? "cases.archivedTitle" : "cases.manage")}</h2>
        <p>{t(archived ? "cases.archivedDescription" : "cases.archiveDescription")}</p>
      </div>
      <div className="case-lifecycle-actions">
        <Button
          variant="secondary"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(!archived)}
        >
          {archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
          {t(archived ? "cases.restore" : "cases.archive")}
        </Button>
        <Button
          variant="ghost"
          className="case-delete-action"
          disabled={mutation.isPending}
          onClick={() => setDeleting(true)}
        >
          <Trash2 size={17} />
          {t("cases.delete")}
        </Button>
      </div>
      {mutation.isError && <ErrorState error={mutation.error} />}
      {deleting && <DeleteCaseDialog item={item} onClose={() => setDeleting(false)} />}
    </section>
  );
}

function DeleteCaseDialog({ item, onClose }: { item: CaseRead; onClose: () => void }) {
  const { t } = useTranslation();
  const { path } = useDesign();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState("");
  const mutation = useDeleteCase(item.id);
  useEffect(() => {
    dialog.current?.showModal();
    input.current?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="case-dialog case-delete-dialog"
      aria-labelledby="delete-case-title"
      aria-describedby="delete-case-description"
      onCancel={(event) => {
        if (mutation.isPending) event.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">{item.reference}</p>
          <h2 id="delete-case-title">{t("cases.deleteTitle")}</h2>
          <p id="delete-case-description">{t("cases.deleteDescription")}</p>
        </div>
        <Button
          variant="ghost"
          disabled={mutation.isPending}
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={20} />
        </Button>
      </div>
      <p className="case-delete-name">{item.title}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (reference !== item.reference || mutation.isPending) return;
          mutation.mutate(reference, {
            onSuccess: () => {
              onClose();
              void navigate(path(item.archived_at ? "/cases?view=archived" : "/cases"), {
                replace: true,
              });
            },
          });
        }}
      >
        <label className="field">
          {t("cases.deleteConfirmation", { reference: item.reference })}
          <input
            ref={input}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={mutation.isPending}
          />
        </label>
        {mutation.isError && <ErrorState error={mutation.error} />}
        <div className="dialog-actions">
          <Button variant="secondary" disabled={mutation.isPending} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            className="case-delete-confirm"
            disabled={reference !== item.reference || mutation.isPending}
          >
            <Trash2 size={16} />
            {t(mutation.isPending ? "cases.deleting" : "cases.deleteForever")}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
