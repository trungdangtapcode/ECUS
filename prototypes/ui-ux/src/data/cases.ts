import sampleCases from '../../fixtures/cases.json';

export type CaseId = 'hardware' | 'silica' | 'durian';
export type DocumentKind = 'contract' | 'invoice' | 'packing' | 'bill' | 'arrival' | 'origin';
export type Document = {
  id: string;
  kind: DocumentKind;
  title: string;
  ref: string;
  date?: string;
  departure?: string;
  pages: number;
  physicalFile: string;
  pageFrom: number;
  pageTo: number;
  state: 'ready' | 'review';
  detail: string;
};
export type Issue = {
  id: string;
  kind: 'error' | 'warning' | 'matched';
  title: string;
  field: string;
  document: DocumentKind;
  values: [string, string];
  labels: [string, string];
  explanation: string;
  action: string;
};
export type CaseRecord = {
  id: CaseId;
  code: string;
  customer: string;
  initials: string;
  goods: string;
  type: string;
  route: [string, string];
  country: string;
  invoice: string;
  bill: string;
  container: string;
  seal: string;
  quantity: number;
  unit: string;
  price: string;
  amount: string;
  packages: string;
  net: string;
  gross: string;
  hs: string;
  hsDescription: string;
  hsMissing: string;
  date: string;
  source: {
    exporter: string;
    manufacturer?: string;
    goods: string;
    invoiceTotal: number;
    packingNote?: string;
    originGoods?: string;
    vessels: Partial<Record<DocumentKind, string>>;
  };
  documents: Document[];
  issues: Issue[];
};

export const cases = sampleCases as CaseRecord[];

export const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
export const findCase = (id: CaseId) => cases.find((c) => c.id === id)!;
