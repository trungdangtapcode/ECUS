import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDesign } from "../design/context";

export function NotFoundPage() {
  const { t } = useTranslation();
  const { path } = useDesign();
  return (
    <section className="empty-state">
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.description")}</p>
      <Link to={path("/cases")}>{t("common.back")}</Link>
    </section>
  );
}
