import { copy } from '../lib/copy';

export const canonicalFields = [
  { key: 'description', label: copy.description, type: 'textarea' },
  { key: 'quantity', label: copy.quantity, type: 'decimal' },
  { key: 'price', label: copy.price, type: 'decimal' },
] as const;
export type CanonicalField = (typeof canonicalFields)[number]['key'];
