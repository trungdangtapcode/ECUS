import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

export type SelectOption = { value: string; label: string; description?: string };

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  icon: Icon,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  icon?: LucideIcon;
}) {
  // Keep the menu inside the current theme and, when present, the native dialog's top layer.
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const attach = useCallback((node: HTMLButtonElement | null) => {
    if (node) setPortalRoot(node.closest('dialog') ?? node.closest<HTMLElement>('.theme-root'));
  }, []);
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger ref={attach} className="select-trigger" aria-label={label}>
        {Icon && <Icon className="select-leading-icon" size={17} />}
        <Select.Value />
        <Select.Icon className="select-chevron">
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalRoot ?? undefined}>
        <Select.Content
          className="select-menu"
          position="popper"
          sideOffset={8}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="select-scroll">
            <ChevronUp size={15} />
          </Select.ScrollUpButton>
          <Select.Viewport className="select-viewport">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                textValue={option.label}
                className="select-option"
              >
                <span className="select-option-copy">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  {option.description && <small>{option.description}</small>}
                </span>
                <Select.ItemIndicator className="select-check">
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="select-scroll">
            <ChevronDown size={15} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
