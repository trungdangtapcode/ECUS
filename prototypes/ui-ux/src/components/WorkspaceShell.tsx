import {
  Check,
  CircleHelp,
  FileCheck2,
  Files,
  LayoutDashboard,
  ListChecks,
  PanelLeftClose,
  SearchCheck,
  SquarePen,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cases } from '../data/cases';
import { getDesign, screens, type ScreenId } from '../config/designs';
import { useStudio } from '../state/StudioContext';
import { Badge, Modal } from './ui';
import { SelectField } from './SelectField';
import { copy, visualCopy, productCopy } from '../lib/copy';
import { CargoArtwork } from './CargoArtwork';
import { CompassRose, RouteOrbits } from './MaritimeDetails';

const icons: Record<ScreenId, LucideIcon> = {
  overview: LayoutDashboard,
  documents: Files,
  reconcile: SearchCheck,
  consolidation: SquarePen,
  review: ListChecks,
};
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { design, screen, navigate, record, selectCase, unresolved, revision } = useStudio();
  const [help, setHelp] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const concept = getDesign(design!);
  const nav = (
    <nav className="workspace-nav" aria-label="Màn hình nghiệp vụ">
      {screens.map((s) => {
        const Icon = icons[s.id];
        return (
          <button
            key={s.id}
            className={screen === s.id ? 'active' : ''}
            aria-current={screen === s.id ? 'page' : undefined}
            onClick={() => navigate(s.id)}
            title={s.label}
          >
            <span className="nav-icon">
              <Icon size={19} />
            </span>
            <span>{design === 'harbor' ? s.label : s.short}</span>
            {s.id === 'reconcile' && unresolved.length > 0 && <em>{unresolved.length}</em>}
          </button>
        );
      })}
    </nav>
  );
  return (
    <div className={`workspace layout-${design} ${collapsed ? 'nav-collapsed' : ''}`}>
      {design !== 'ledger' && (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">
              <FileCheck2 size={23} />
            </span>
            <div>
              <strong>
                precheck<span>.</span>
              </strong>
              <small>CUSTOMS WORKSPACE</small>
            </div>
          </div>
          {nav}
          <div className="sidebar-illustration" aria-hidden="true">
            {design === 'harbor' ? (
              <>
                <CompassRose />
                <CargoArtwork />
              </>
            ) : (
              <>
                <RouteOrbits />
                <CompassRose />
              </>
            )}
            <span>{visualCopy.sourceTrail}</span>
            <small>{visualCopy.reviewNote}</small>
          </div>
          <div className="sidebar-bottom">
            <button className="help-button" onClick={() => setHelp(true)}>
              <CircleHelp size={18} />
              <span>{productCopy.help}</span>
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="icon-button"
              aria-label="Thu gọn hoặc mở thanh điều hướng"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
        </aside>
      )}
      <div className="workspace-main">
        <header className="app-topbar">
          {design === 'ledger' ? (
            <div className="ledger-brand">
              <FileCheck2 size={25} />
              <strong>
                precheck<span> / ledger</span>
              </strong>
            </div>
          ) : (
            <div className="breadcrumbs">
              Không gian làm việc <span>/</span>
              <strong>{screens.find((s) => s.id === screen)?.short}</strong>
            </div>
          )}
          <div className="topbar-right">
            <span className="save-status">
              <Check size={13} />
              {productCopy.savedLocally}
            </span>
          </div>
        </header>
        {design === 'ledger' && (
          <div className="ledger-navigation">
            {nav}
            <button className="help-button" onClick={() => setHelp(true)}>
              <CircleHelp size={17} />
              Hướng dẫn
            </button>
          </div>
        )}
        <main className="page-content" id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {design === 'ledger' ? 'SỔ NGHIỆP VỤ / ' : ''}
                {screen === 'overview'
                  ? 'KIỂM TRA TRƯỚC KHAI BÁO'
                  : `${record.code} / ${record.type}`}
                {screen === 'consolidation' && (
                  <span className="canonical-heading-revision">
                    {copy.revision}
                    <strong>{String(revision).padStart(2, '0')}</strong>
                  </span>
                )}
              </div>
              <h1>
                {screen === 'overview'
                  ? design === 'harbor'
                    ? screens.find((s) => s.id === 'overview')?.label
                    : design === 'control'
                      ? 'Bàn làm việc của bạn'
                      : 'Sổ hồ sơ khai báo'
                  : screens.find((s) => s.id === screen)?.label}
              </h1>
              <p>
                {screen === 'overview'
                  ? screens.find((s) => s.id === 'overview')?.description
                  : screen === 'consolidation'
                    ? copy.canonicalNote
                    : screens.find((s) => s.id === screen)?.description}
              </p>
            </div>
            {screen === 'overview' ? (
              <Badge tone="accent">
                {cases.length} {productCopy.records}
              </Badge>
            ) : (
              <label className="case-select">
                <span>ĐANG XEM HỒ SƠ</span>
                <SelectField
                  label="ĐANG XEM HỒ SƠ"
                  icon={Files}
                  value={record.id}
                  onValueChange={(value) => selectCase(value as typeof record.id)}
                  options={cases.map((c) => ({
                    value: c.id,
                    label: `${c.customer} · ${c.type}`,
                    description: `${c.code} · ${c.route.join(' → ')}`,
                  }))}
                />
              </label>
            )}
          </div>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>
            <FileCheck2 size={13} />
            PRECHECK · {concept.name}
          </span>
          <span>{productCopy.footer}</span>
        </footer>
      </div>
      {help && (
        <Modal title={productCopy.helpTitle} onClose={() => setHelp(false)}>
          <ol className="help-steps">
            {productCopy.guideSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="subtle">{productCopy.guideNote}</p>
        </Modal>
      )}
    </div>
  );
}
