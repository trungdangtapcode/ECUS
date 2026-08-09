import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CargoArtwork } from "./cargo-artwork";
import { CompassRose } from "./maritime-details";
import { media } from "./media";

export function ShipmentCover({
  item,
  onCreate,
}: {
  item?: { id: string; reference: string; title: string; procedure: string };
  onCreate: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="shipment-cover cover-harbor" aria-labelledby="cover-title">
      <div className="cover-art" aria-hidden="true">
        <div className="cover-photo">
          <img src={media.harborCover.src} alt="" />
        </div>
        <CompassRose />
        <CargoArtwork />
      </div>
      <div className="cover-copy">
        <span className="cover-caption">
          <i aria-hidden="true" />
          {t("studioVisual.harborCaption")}
        </span>
        <h2 id="cover-title">{t("studioVisual.harborTitle")}</h2>
        <div className="cover-case">
          <span>
            {t("harborApp.selected")}
            <b>{item?.reference ?? "—"}</b>
          </span>
          <strong>{item?.title ?? t("cases.emptyTitle")}</strong>
          <p>{item?.procedure ?? t("cases.emptyDescription")}</p>
        </div>
        {item ? (
          <Link className="cover-action" to={`/cases/${item.id}/review?section=compare`}>
            {t("studioVisual.continue")}
            <ArrowUpRight size={17} />
          </Link>
        ) : (
          <button className="cover-action" onClick={onCreate}>
            {t("cases.guide.action")}
            <ArrowUpRight size={17} />
          </button>
        )}
      </div>
      <a
        className="cover-photo-credit"
        href={media.harborCover.source}
        target="_blank"
        rel="noreferrer"
      >
        {media.harborCover.credit}
      </a>
    </section>
  );
}
