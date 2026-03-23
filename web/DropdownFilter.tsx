import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import "./css/DropdownFilter.css";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownFilterProps {
  name: string;
  label?: string;
  value: string;
  onChange: (name: string, value: string) => void;
  options?: Array<string | DropdownOption>;
  id?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  renderOption?: (option: DropdownOption, meta: { isSelected: boolean }) => ReactNode;
}

export default function DropdownFilter({
  name,
  label,
  value,
  onChange,
  options = [],
  id,
  containerClassName = "filter-container",
  labelClassName = "filter-label",
  selectClassName = "filter-select",
  renderOption,
}: DropdownFilterProps) {
  const selectId = id ?? `filter-${name}`;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const normalizedOptions = useMemo<DropdownOption[]>(
    () =>
      options.map((option) =>
        typeof option === "string" ? { value: option, label: option } : option
      ),
    [options]
  );

  const selectedOption =
    normalizedOptions.find((option) => option.value === value) ??
    normalizedOptions[0];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSelect = (nextValue: string) => {
    if (nextValue !== value) {
      onChange(name, nextValue);
    }
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className={containerClassName} ref={containerRef}>
      {label ? (
        <label className={labelClassName} htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <div className="filter-select-wrapper">
        <button
          id={selectId}
          ref={buttonRef}
          type="button"
          className={`${selectClassName} filter-select-trigger`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="filter-select-value">
            {selectedOption?.label ?? "Select"}
          </span>
          <span className="filter-select-icon" aria-hidden="true">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        {isOpen ? (
          <ul className="filter-select-menu" role="listbox">
            {normalizedOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <div
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={`filter-select-option${isSelected ? " is-selected" : ""}`}
                    onClick={() => handleSelect(option.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelect(option.value);
                      }
                    }}
                  >
                    {renderOption
                      ? renderOption(option, { isSelected })
                      : option.label}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
