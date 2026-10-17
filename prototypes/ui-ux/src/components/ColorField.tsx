import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  swatches: { value: string; label: string }[];
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="color-field">
      <label>
        {label}
        <span className="color-input">
          <span className="color-preview" style={{ background: value }} aria-hidden="true" />
          <input
            aria-label={label}
            value={draft}
            spellCheck={false}
            maxLength={7}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next);
            }}
            onBlur={() => setDraft(value)}
          />
        </span>
      </label>
      <div className="color-swatches">
        {swatches.map((swatch) => (
          <button
            key={swatch.label}
            type="button"
            title={swatch.label}
            aria-label={`${label} · ${swatch.label}`}
            aria-pressed={value === swatch.value}
            style={{ background: swatch.value }}
            onClick={() => onChange(swatch.value)}
          >
            {value === swatch.value && <Check size={13} />}
          </button>
        ))}
      </div>
    </div>
  );
}
