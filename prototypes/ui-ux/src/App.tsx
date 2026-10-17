import { useEffect, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { getDesign } from './config/designs';
import { themeStyle } from './config/theme-style';
import { useStudio } from './state/StudioContext';
import { Gallery } from './views/Gallery';
import { Overview } from './views/Overview';
import { Documents } from './views/Documents';
import { Reconciliation } from './views/Reconciliation';
import { Consolidation } from './views/Consolidation';
import { Review } from './views/Review';
import { Landing } from './views/Landing';
import { StudioTools, type Overrides } from './components/StudioTools';
import { WorkspaceShell } from './components/WorkspaceShell';
import { productCopy } from './lib/copy';

const views = {
  overview: Overview,
  documents: Documents,
  reconcile: Reconciliation,
  consolidation: Consolidation,
  review: Review,
};
export default function App() {
  const { design, screen, caseId, notice, storageError } = useStudio();
  const [overrides, setOverrides] = useState<Overrides>({});
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen, caseId]);
  if (!design)
    return (
      <>
        <Gallery />
        {notice && (
          <div className="toast" role="status">
            <Check size={17} />
            {notice}
          </div>
        )}
      </>
    );
  const View = screen === 'landing' ? null : views[screen];
  const tokens = { ...getDesign(design).tokens, ...overrides[design] };
  return (
    <div className="theme-root" data-theme={design} data-screen={screen} style={themeStyle(tokens)}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <StudioTools overrides={overrides} onOverrides={setOverrides} />
      {View ? (
        <WorkspaceShell>
          <View key={`${screen}-${caseId}`} />
        </WorkspaceShell>
      ) : (
        <Landing />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {storageError && (
        <div className="storage-error" role="alert">
          <CircleAlert size={16} />
          {productCopy.storageError}
        </div>
      )}
    </div>
  );
}
