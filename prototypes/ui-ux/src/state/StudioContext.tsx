import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cases, findCase, type CaseId, type DocumentKind } from '../data/cases';
import { designs, screens, type DesignId, type StudioScreen } from '../config/designs';
import { comparisonsFor, requiresReview } from '../domain/comparison';
import type { CanonicalField } from '../config/forms';
import { copy, productCopy } from '../lib/copy';

type Draft = Record<CanonicalField, string>;
export type AuditEvent = { id: string; caseId: CaseId; at: string; action: string; detail: string };
type CanonicalSelection = { documentId: string; reason: string };
export type Decision = { note: string; status: 'requested' | 'confirmed' };
type Feedback = { scores: Record<string, number>; note: string; preferred: boolean };
type Stored = {
  drafts: Record<CaseId, Draft>;
  decisions: Record<string, Decision>;
  selections: Partial<Record<CaseId, Partial<Record<CanonicalField, CanonicalSelection>>>>;
  revisions: Partial<Record<CaseId, number>>;
  audit: AuditEvent[];
  sourceReviewed: Partial<Record<CaseId, boolean>>;
  approvals: Partial<Record<CaseId, boolean>>;
  uploads: Partial<Record<CaseId, string[]>>;
  feedback: Partial<Record<DesignId, Feedback>>;
};
const key = 'ecus-design-studio-v2';
const initialData = (): Stored => ({
  drafts: Object.fromEntries(
    cases.map((c) => [
      c.id,
      { description: c.goods, quantity: String(c.quantity), price: c.price },
    ]),
  ) as Stored['drafts'],
  decisions: {},
  selections: {},
  revisions: {},
  audit: [],
  sourceReviewed: {},
  approvals: {},
  uploads: {},
  feedback: {},
});
function readData(): Stored {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const base = initialData();
    if (!saved || typeof saved !== 'object') return base;
    for (const field of Object.keys(base) as (keyof Stored)[])
      if (!saved[field] || typeof saved[field] !== 'object') return base;
    for (const c of cases)
      if (!saved.drafts[c.id] || typeof saved.drafts[c.id].description !== 'string') return base;
    return saved as Stored;
  } catch {
    return initialData();
  }
}
function readRoute() {
  const query = new URLSearchParams(location.search);
  const design = designs.find((d) => d.id === query.get('design'))?.id;
  const requestedScreen =
    query.get('screen') === 'declaration' ? 'consolidation' : query.get('screen');
  const screen: StudioScreen =
    requestedScreen === 'landing'
      ? 'landing'
      : (screens.find((s) => s.id === requestedScreen)?.id ?? 'overview');
  const caseId = cases.find((c) => c.id === query.get('case'))?.id ?? 'hardware';
  return { design, screen, caseId };
}
function useStudioState() {
  const [route, setRoute] = useState(readRoute);
  const [data, setData] = useState(readData);
  const [notice, setNotice] = useState('');
  const [sources, setSources] = useState<Record<string, File>>({});
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  useEffect(() => {
    const query = new URLSearchParams();
    if (route.design) {
      query.set('design', route.design);
      query.set('screen', route.screen);
      query.set('case', route.caseId);
    }
    history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}`);
  }, [route]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const record = findCase(route.caseId);
  const invalidate = (current: Stored): Stored => ({
    ...current,
    approvals: { ...current.approvals, [route.caseId]: false },
    revisions: { ...current.revisions, [route.caseId]: (current.revisions[route.caseId] ?? 1) + 1 },
  });
  const comparisons = comparisonsFor(record);
  const unresolved = comparisons.filter(
    (issue) => requiresReview(issue) && data.decisions[issue.id]?.status !== 'confirmed',
  );
  const draft = data.drafts[record.id];
  const draftIssues = [
    ...(!draft.description.trim() ? [copy.description] : []),
    ...(!/^\d+(\.\d+)?$/.test(draft.quantity) || Number(draft.quantity) <= 0
      ? [copy.quantity]
      : []),
    ...(!/^\d+(\.\d+)?$/.test(draft.price) || Number(draft.price) < 0 ? [copy.price] : []),
  ];
  function log(current: Stored, action: string, detail: string): Stored {
    return {
      ...current,
      audit: [
        ...current.audit,
        {
          id: crypto.randomUUID(),
          caseId: record.id,
          at: new Date().toISOString(),
          action,
          detail,
        },
      ].slice(-200),
    };
  }
  return {
    ...route,
    data,
    record,
    notice,
    storageError,
    sources,
    attachSource: (kind: DocumentKind, file: File) => {
      const document = record.documents.find((item) => item.kind === kind);
      if (document)
        setSources((current) => ({ ...current, [`${record.id}:${document.physicalFile}`]: file }));
    },
    unresolved,
    comparisons,
    revision: data.revisions[record.id] ?? 1,
    draftIssues,
    setNotice,
    navigate: (screen: StudioScreen) => setRoute((r) => ({ ...r, screen })),
    selectCase: (caseId: CaseId, screen?: StudioScreen) =>
      setRoute((r) => ({ ...r, caseId, screen: screen ?? r.screen })),
    selectDesign: (design: DesignId | undefined) => setRoute((r) => ({ ...r, design })),
    updateDraft: (patch: Partial<Draft>) =>
      setData((d) =>
        log(
          {
            ...invalidate(d),
            drafts: { ...d.drafts, [record.id]: { ...d.drafts[record.id], ...patch } },
          },
          'updated',
          Object.keys(patch).join(', '),
        ),
      ),
    selectSource: (field: CanonicalField, selection: CanonicalSelection) =>
      setData((d) =>
        log(
          {
            ...invalidate(d),
            selections: {
              ...d.selections,
              [record.id]: { ...d.selections[record.id], [field]: selection },
            },
          },
          'sourceSelected',
          `${field}: ${selection.documentId}`,
        ),
      ),
    decide: (issueId: string, decision: Decision) => {
      const issue = comparisons.find((i) => i.id === issueId);
      if (!issue || !decision.note.trim()) return;
      // A local note cannot clear a blocking source-document error.
      const status = issue.status !== 'NEEDS_REVIEW' ? 'requested' : decision.status;
      setData((d) =>
        log(
          {
            ...invalidate(d),
            decisions: { ...d.decisions, [issueId]: { note: decision.note.trim(), status } },
          },
          'reviewed',
          `${issueId}: ${decision.note.trim()}`,
        ),
      );
      setNotice(
        status === 'confirmed'
          ? productCopy.confirmationSaved
          : 'Đã lưu yêu cầu xác minh. Vấn đề vẫn đang mở.',
      );
    },
    upload: (names: string[]) => {
      setData((d) => ({
        ...invalidate(d),
        uploads: {
          ...d.uploads,
          [record.id]: [...new Set([...(d.uploads[record.id] ?? []), ...names])],
        },
        sourceReviewed: { ...d.sourceReviewed, [record.id]: false },
      }));
      setNotice(productCopy.uploadSaved);
    },
    removeUpload: (name: string) =>
      setData((d) => ({
        ...invalidate(d),
        uploads: { ...d.uploads, [record.id]: d.uploads[record.id]?.filter((n) => n !== name) },
      })),
    saveFeedback: (designId: DesignId, feedback: Feedback) => {
      setData((d) => ({ ...d, feedback: { ...d.feedback, [designId]: feedback } }));
      setNotice('Đã lưu phản hồi trên trình duyệt này.');
    },
    reset: () => {
      setData(initialData());
      setSources({});
      setNotice(productCopy.resetSaved);
    },
  };
}
type Studio = ReturnType<typeof useStudioState>;
const Context = createContext<Studio | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useStudioState()}>{children}</Context.Provider>;
}
export function useStudio() {
  const value = useContext(Context);
  if (!value) throw new Error('StudioProvider required');
  return value;
}

export function downloadText(name: string, content: string, mime = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
