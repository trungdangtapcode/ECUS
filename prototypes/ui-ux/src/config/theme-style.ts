import type { CSSProperties } from 'react';
import type { ThemeTokens } from './designs';

export function themeStyle(tokens: ThemeTokens): CSSProperties {
  return Object.fromEntries(
    Object.entries(tokens).map(([key, value]) => [
      `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    ]),
  ) as CSSProperties;
}
