import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Compass,
  FileCheck2,
  Layers3,
  LayoutDashboard,
  ListChecks,
  SlidersHorizontal,
} from 'lucide-react';
import { designs, type Design } from '../config/designs';
import { useStudio } from '../state/StudioContext';
import { useState } from 'react';
import { Modal } from '../components/ui';
import { CargoArtwork } from '../components/CargoArtwork';
import { CompassRose, DocumentSculpture } from '../components/MaritimeDetails';
import { landingCopy, visualCopy, productCopy } from '../lib/copy';
import { themeStyle } from '../config/theme-style';

export function Miniature({ design }: { design: Design }) {
  return (
    <div className={`miniature miniature-${design.id}`} aria-hidden="true">
      <div className="mini-top">
        <div className="mini-brand">
          <FileCheck2 size={12} />
          precheck
          <span />
        </div>
        <div className="mini-avatar" />
      </div>
      <div className="mini-body">
        <div className="mini-nav">
          {[LayoutDashboard, Layers3, CheckCheck, ListChecks].map((Icon, i) => (
            <div className={i === 0 ? 'active' : ''} key={i}>
              <Icon size={11} />
              <span />
            </div>
          ))}
        </div>
        <div className="mini-content">
          <div className="mini-eyebrow" />
          <div className="mini-heading">
            {design.id === 'harbor'
              ? 'Một hành trình rõ ràng.'
              : design.id === 'control'
                ? 'Bàn làm việc của bạn'
                : 'Sổ hồ sơ khai báo'}
          </div>
          {design.id === 'harbor' ? (
            <>
              <div className="mini-welcome">
                <span>{productCopy.galleryContinue}</span>
                <ArrowRight size={13} />
                <div className="mini-steps">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} className={n < 3 ? 'done' : ''}>
                      {n < 3 ? <Check size={8} /> : n}
                    </i>
                  ))}
                </div>
              </div>
              <div className="mini-metrics">
                {['Hồ sơ', 'Cần rà soát', 'Hoàn tất'].map((t, i) => (
                  <div key={t}>
                    <small>{t}</small>
                    <strong>{[3, 2, 0][i]}</strong>
                  </div>
                ))}
              </div>
              <MiniRows />
            </>
          ) : design.id === 'control' ? (
            <div className="mini-panels">
              <div>
                <div className="mini-doc">
                  <span>COMMERCIAL INVOICE</span>
                  <div />
                  <div />
                  <div className="marked" />
                  <div />
                  <div />
                </div>
              </div>
              <div className="mini-issues">
                <strong>Đối chiếu dữ liệu</strong>
                <div className="mini-alert">
                  Số lượng chưa khớp<small>1.000 / 1.020 SET</small>
                </div>
                <div className="mini-alert muted">
                  Xác minh vận tải<small>B/L → Arrival Notice</small>
                </div>
                <span className="mini-action">Xem bằng chứng →</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mini-tabs">
                <span>Tất cả hồ sơ</span>
                <span>Nhập khẩu</span>
                <span>Xuất khẩu</span>
              </div>
              <MiniRows />
              <MiniRows />
              <div className="mini-ledger-footer">DỮ LIỆU CÓ NGUỒN · QUYẾT ĐỊNH CÓ CĂN CỨ</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function MiniRows() {
  return (
    <div className="mini-rows">
      {[1, 2, 3].map((n) => (
        <div key={n}>
          <i />
          <span />
          <span />
          <em />
        </div>
      ))}
    </div>
  );
}

export function Gallery() {
  const { selectDesign, navigate, data } = useStudio();
  const [compare, setCompare] = useState(false);
  return (
    <div className="gallery">
      <header className="gallery-header">
        <a className="brand" href="./">
          <span className="brand-mark">
            <FileCheck2 size={22} />
          </span>
          <span>
            precheck<span className="brand-caption">CUSTOMS WORKSPACE</span>
          </span>
        </a>
        <div className="gallery-header-tag">
          <span className="live-dot" />
          {productCopy.workspace}
        </div>
      </header>
      <main className="gallery-main">
        <section className="gallery-intro">
          <div>
            <h1 className="gallery-product-title">{productCopy.galleryTitle}</h1>
          </div>
          <div className="gallery-intro-aside">
            <CargoArtwork />
            <p>
              Cùng một bộ chứng từ.
              <br />
              Ba trải nghiệm được thiết kế cho
              <br />
              những cách làm việc khác nhau.
            </p>
            <button className="gallery-compare" onClick={() => setCompare(true)}>
              So sánh các phương án <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <div className="gallery-context">
          <span>
            <Layers3 size={15} />
            {productCopy.gallerySteps}
          </span>
          <span>
            <CheckCheck size={15} />
            Cùng dữ liệu nghiệp vụ
          </span>
          <span>
            <SlidersHorizontal size={15} />
            {productCopy.galleryCustomize}
          </span>
          <span className="gallery-scroll">
            CHỌN ĐỂ TRẢI NGHIỆM <ArrowDown size={14} />
          </span>
        </div>
        <section className="concept-grid" aria-label="Ba phương án giao diện">
          {designs.map((d) => (
            <article
              className={`concept-card concept-${d.id}`}
              key={d.id}
              style={themeStyle(d.tokens)}
            >
              <button
                className="concept-preview"
                onClick={() => selectDesign(d.id)}
                aria-label={`Xem phương án ${d.name}`}
              >
                <div className="concept-art" aria-hidden="true">
                  {d.id === 'control' ? <DocumentSculpture /> : <CompassRose />}
                </div>
                <Miniature design={d} />
                <span className="concept-palette" aria-hidden="true">
                  {['accent', 'secondary', 'ink', 'canvas'].map((token) => (
                    <i key={token} style={{ background: `var(--${token})` }} />
                  ))}
                </span>
                <span className="preview-open">
                  <ArrowUpRight size={20} />
                </span>
              </button>
              <div className="concept-body">
                <p className="concept-art-direction">
                  {d.id === 'harbor'
                    ? visualCopy.galleryHarbor
                    : d.id === 'control'
                      ? visualCopy.galleryControl
                      : visualCopy.galleryLedger}
                </p>
                <div className="concept-title">
                  <span className="concept-letter">{d.letter}</span>
                  <h2>{d.name}</h2>
                  <span className="concept-index">0{designs.indexOf(d) + 1}</span>
                </div>
                <h3>{d.label}</h3>
                <p>{d.description}</p>
                <div className="concept-tags">
                  {d.keywords.slice(0, 2).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="concept-audience">
                  <Compass size={15} />
                  <span>{d.audience}</span>
                </div>
                <button className="concept-launch" onClick={() => selectDesign(d.id)}>
                  Trải nghiệm {d.name}
                  <ArrowRight size={17} />
                </button>
                <button
                  className="concept-landing-link"
                  onClick={() => {
                    selectDesign(d.id);
                    navigate('landing');
                  }}
                >
                  {landingCopy.viewLanding}
                  <ArrowUpRight size={15} />
                </button>
                {data.feedback[d.id]?.preferred && (
                  <span className="concept-selected">
                    <Check size={13} />
                    Đã đánh dấu yêu thích trên máy này
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>
        <section className="gallery-bottom">
          <div>
            <span className="bottom-number">01—03</span>
            <p>
              {productCopy.galleryStart}
              <br />
              <strong>{productCopy.galleryContinue}</strong>
            </p>
          </div>
          <p>
            {productCopy.gallerySummary}
            <br />
            {productCopy.galleryOutcome}
          </p>
        </section>
      </main>
      <footer className="gallery-footer">
        <span>PRECHECK / CUSTOMS WORKSPACE</span>
        <span>{productCopy.galleryFooter}</span>
      </footer>
      {compare && (
        <Modal title="Chọn trải nghiệm phù hợp" onClose={() => setCompare(false)} wide>
          <div className="comparison-grid">
            {designs.map((d) => (
              <div key={d.id}>
                <span className={`concept-letter letter-${d.id}`}>{d.letter}</span>
                <h3>{d.name}</h3>
                <p>{d.description}</p>
                <strong>Phù hợp với</strong>
                <p>{d.audience}</p>
                <strong>Cân nhắc</strong>
                <p>{d.tradeoff}</p>
                <button className="button button-primary" onClick={() => selectDesign(d.id)}>
                  Mở {d.name}
                  <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
          <p className="subtle">{productCopy.galleryPreserve}</p>
        </Modal>
      )}
    </div>
  );
}
