import { FileText, Minus, Plus, RotateCcw } from 'lucide-react';
import { useState, useRef } from 'react';
import { type DocumentKind, formatNumber } from '../data/cases';
import { useStudio } from '../state/StudioContext';
import { copy, productCopy } from '../lib/copy';
import { OriginalSource } from './OriginalSource';
import { Button } from './ui';

const labels: Record<DocumentKind, string> = {
  contract: 'SALES CONTRACT',
  invoice: 'COMMERCIAL INVOICE',
  packing: 'PACKING LIST',
  bill: 'BILL OF LADING',
  arrival: 'ARRIVAL NOTICE',
  origin: 'CERTIFICATE OF ORIGIN',
};
export function SourceDocument({
  kind = 'invoice',
  highlight = 'quantity',
}: {
  kind?: DocumentKind;
  highlight?: string;
}) {
  const { record, sources, attachSource, setNotice } = useStudio();
  const fileInput = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(100);
  const { source } = record;
  const document = record.documents.find((d) => d.kind === kind);
  const attached = document ? sources[`${record.id}:${document.physicalFile}`] : undefined;
  if (!document) {
    return (
      <div className="source-viewer">
        <div className="empty-state">
          <FileText size={30} />
          <strong>{record.issues[0]?.values[1]}</strong>
          <p>{record.issues[0]?.explanation}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="source-viewer">
      <div className="source-toolbar">
        <span>
          <FileText size={15} />
          {labels[kind]}
        </span>
        <div>
          <button
            aria-label="Thu nhỏ chứng từ"
            title="Thu nhỏ chứng từ"
            disabled={zoom === 80}
            onClick={() => setZoom((z) => Math.max(80, z - 10))}
          >
            <Minus size={14} />
          </button>
          <small>{zoom}%</small>
          <button
            aria-label="Phóng to chứng từ"
            title="Phóng to chứng từ"
            disabled={zoom === 130}
            onClick={() => setZoom((z) => Math.min(130, z + 10))}
          >
            <Plus size={14} />
          </button>
          <button
            aria-label="Khôi phục kích thước chứng từ"
            title="Khôi phục kích thước chứng từ"
            onClick={() => setZoom(100)}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
      <div className="evidence-identity">
        <strong>
          {copy.expectedFile}: {document.physicalFile}
        </strong>
        <small>
          {copy.logicalDocument}: {document.title} · {copy.page}: {document.pageFrom}–
          {document.pageTo}
        </small>
        <small>{attached ? copy.originalNote : copy.sourceUnavailable}</small>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>
          {copy.connectOriginal}
        </Button>
        <input
          className="sr-only"
          ref={fileInput}
          type="file"
          accept=".pdf"
          aria-label={copy.connectOriginal}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && /\.pdf$/i.test(file.name) && file.size <= 25 * 1024 * 1024)
              attachSource(kind, file);
            else setNotice(copy.invalidFile);
            event.target.value = '';
          }}
        />
      </div>
      {attached ? (
        <OriginalSource
          key={`${attached.name}-${attached.lastModified}`}
          file={attached}
          initialPage={document.pageFrom}
        />
      ) : (
        <div className="paper-scroll">
          <article className="document-paper" style={{ fontSize: `${(zoom / 100) * 13}px` }}>
            <div className="paper-stamp">{productCopy.excerptStamp}</div>
            <div className="paper-exporter">
              {kind === 'origin' ? (source.manufacturer ?? source.exporter) : source.exporter}
            </div>
            <div className="paper-subtitle">Thông tin liên hệ và ngân hàng đã được lược bỏ</div>
            <h3>{labels[kind]}</h3>
            <div className="paper-meta">
              <div>
                <small>BUYER / CONSIGNEE</small>
                <strong>{record.customer.toUpperCase()}</strong>
                <span>VIETNAM</span>
              </div>
              <div>
                <small>REFERENCE</small>
                <strong>{document?.ref ?? record.invoice}</strong>
                <span>{document?.date ?? record.date}</span>
              </div>
            </div>
            <div className="paper-route">
              FROM {(document.departure ?? record.route[0]).toUpperCase()} TO{' '}
              {record.route[1].toUpperCase()}
            </div>
            {kind === 'contract' || kind === 'invoice' || kind === 'packing' ? (
              <>
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th>DESCRIPTION</th>
                      <th>
                        QUANTITY
                        <br />
                        {record.unit}
                      </th>
                      <th>{kind === 'packing' ? 'G.W. (KG)' : 'UNIT PRICE'}</th>
                      <th>{kind === 'packing' ? 'PACKAGES' : 'AMOUNT USD'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{source.goods}</td>
                      <td className={highlight.includes('quantity') ? 'paper-highlight' : ''}>
                        {formatNumber(record.quantity)}
                      </td>
                      <td className={highlight.includes('amount') ? 'paper-highlight' : ''}>
                        {kind === 'packing' ? record.gross : record.price.replace('.', ',')}
                      </td>
                      <td>{kind === 'packing' ? record.packages : record.amount}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>TOTAL</strong>
                      </td>
                      <td className={highlight.includes('quantity') ? 'paper-highlight' : ''}>
                        <strong>
                          {formatNumber(kind === 'invoice' ? source.invoiceTotal : record.quantity)}
                        </strong>
                      </td>
                      <td>{kind === 'packing' && <strong>{record.gross}</strong>}</td>
                      <td>
                        <strong>{kind === 'packing' ? record.packages : record.amount}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {source.packingNote && kind === 'packing' && (
                  <div className="paper-note">{source.packingNote}</div>
                )}
              </>
            ) : kind === 'origin' ? (
              <div className="paper-shipping">
                <div>
                  <small>FORM E / REFERENCE</small>
                  <strong>{document?.ref}</strong>
                </div>
                <div>
                  <small>GOODS / HS HEADING</small>
                  <strong>{source.originGoods}</strong>
                </div>
                <div>
                  <small>QUANTITY / GROSS WEIGHT</small>
                  <strong>
                    {formatNumber(record.quantity)} {record.unit} / {record.gross} KGS
                  </strong>
                </div>
                <div>
                  <small>THIRD PARTY INVOICING</small>
                  <strong>{source.exporter}</strong>
                </div>
              </div>
            ) : (
              <div className="paper-shipping">
                <div>
                  <small>VESSEL / VOYAGE</small>
                  <strong className="paper-highlight">{source.vessels[kind]}</strong>
                </div>
                <div>
                  <small>CONTAINER / SEAL</small>
                  <strong>
                    {record.container} / {record.seal}
                  </strong>
                </div>
                <div>
                  <small>GROSS WEIGHT</small>
                  <strong>{record.gross} KGS</strong>
                </div>
              </div>
            )}
            <p className="paper-note">
              {kind === 'origin'
                ? 'FORM E · Thông tin cần rà soát trên bản scan gốc.'
                : productCopy.excerptBody}
            </p>
            <div className="paper-sign">
              AUTHORIZED SIGNATURE
              <div className="paper-sign-line" />
            </div>
            <footer>{productCopy.excerptFooter}</footer>
          </article>
        </div>
      )}
      <div className="source-footer">
        <span className="live-dot" />
        {attached ? copy.originalNote : copy.sampleEvidence}
      </div>
    </div>
  );
}
