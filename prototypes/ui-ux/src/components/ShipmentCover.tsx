import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useStudio } from '../state/StudioContext';
import { media } from '../config/media';
import { visualCopy } from '../lib/copy';
import { ArchiveMark, CompassRose, DocumentSculpture, RouteOrbits } from './MaritimeDetails';
import { CargoArtwork } from './CargoArtwork';

export function ShipmentCover() {
  const { design, record, navigate } = useStudio();
  const title =
    design === 'control'
      ? visualCopy.controlTitle
      : design === 'ledger'
        ? visualCopy.ledgerTitle
        : visualCopy.harborTitle;
  const caption =
    design === 'control'
      ? visualCopy.controlCaption
      : design === 'ledger'
        ? visualCopy.ledgerCaption
        : visualCopy.harborCaption;
  return (
    <section className={`shipment-cover cover-${design}`} aria-labelledby="cover-title">
      <div className="cover-art" aria-hidden="true">
        {design === 'harbor' && (
          <>
            <div className="cover-photo">
              <img src={media.harborCover.src} alt="" />
            </div>
            <CompassRose />
            <CargoArtwork />
          </>
        )}
        {design === 'control' && (
          <>
            <div className="cover-bloom" />
            <RouteOrbits />
            <DocumentSculpture />
          </>
        )}
        {design === 'ledger' && (
          <>
            <CargoArtwork />
            <ArchiveMark />
          </>
        )}
      </div>
      <div className="cover-copy">
        <span className="cover-caption">
          <i aria-hidden="true" />
          {caption}
        </span>
        <h2 id="cover-title">{title}</h2>
        <div className="cover-case">
          <span>
            {visualCopy.activeCase} <b>{record.code}</b>
          </span>
          <strong>{record.customer}</strong>
          <p>{record.goods}</p>
        </div>
        <button className="cover-action" onClick={() => navigate('reconcile')}>
          {visualCopy.continue}
          <ArrowUpRight size={17} />
        </button>
      </div>
      <div className="cover-route">
        <span>
          <small>{visualCopy.origin}</small>
          {record.route[0]}
        </span>
        <span className="cover-route-line" aria-hidden="true">
          <ArrowRight size={15} />
        </span>
        <span>
          <small>{visualCopy.destination}</small>
          {record.route[1]}
        </span>
      </div>
      {design === 'harbor' && (
        <a
          className="cover-photo-credit"
          href={media.harborCover.source}
          target="_blank"
          rel="noreferrer"
        >
          {media.harborCover.credit}
        </a>
      )}
      {design === 'control' && (
        <span className="cover-art-caption" aria-hidden="true">
          {visualCopy.documentSet}
          <span>01 — 03</span>
        </span>
      )}
      {design === 'ledger' && <span className="cover-binding" aria-hidden="true" />}
    </section>
  );
}
