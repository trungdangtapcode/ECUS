import { ApiError } from "@ecus/api-client";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const message =
    error instanceof ApiError
      ? t(`errors.${error.code}`, { defaultValue: t("common.unknownError") })
      : t("common.unknownError");
  return (
    <div role="alert" className="error-state">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        <p>{message}</p>
        {error instanceof ApiError && error.requestId && (
          <small>{t("common.requestId", { id: error.requestId })}</small>
        )}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
