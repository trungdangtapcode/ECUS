import type { CaseRecord, Issue } from '../data/cases';
import { copy } from '../lib/copy';

export const comparisonStatuses = [
  'MATCH',
  'MISMATCH',
  'NOT_COMPARABLE',
  'NEEDS_REVIEW',
  'MISSING_REQUIRED',
  'EXTRACTION_UNCERTAIN',
] as const;
export type ComparisonStatus = (typeof comparisonStatuses)[number];
export type Comparison = Issue & { status: ComparisonStatus };

export function comparisonsFor(record: CaseRecord): Comparison[] {
  const results: Comparison[] = record.issues.map((issue) => ({
    ...issue,
    explanation: record.documents.length === 0 ? copy.missingNote : issue.explanation,
    status:
      record.documents.length === 0
        ? 'MISSING_REQUIRED'
        : issue.kind === 'matched'
          ? 'MATCH'
          : issue.kind === 'error'
            ? 'MISMATCH'
            : 'NEEDS_REVIEW',
  }));
  if (record.documents.some((document) => document.kind === 'invoice')) {
    results.push({
      id: `${record.id}-price-coverage`,
      kind: 'matched',
      status: 'NOT_COMPARABLE',
      field: copy.price,
      title: copy.statuses.NOT_COMPARABLE,
      document: 'invoice',
      values: [record.price, '—'],
      labels: ['Commercial Invoice', 'Packing List / B/L'],
      explanation: copy.notComparableNote,
      action: copy.openEvidence,
    });
  }
  if (record.documents.some((document) => document.kind === 'origin')) {
    results.push({
      id: `${record.id}-scan-review`,
      kind: 'warning',
      status: 'EXTRACTION_UNCERTAIN',
      field: 'C/O',
      title: copy.uncertainTitle,
      document: 'origin',
      values: ['—', '—'],
      labels: [copy.source, copy.sourceUnverified],
      explanation: copy.uncertainNote,
      action: copy.openEvidence,
    });
  }
  return results;
}

export function requiresReview(result: Comparison): boolean {
  return !['MATCH', 'NOT_COMPARABLE'].includes(result.status);
}
