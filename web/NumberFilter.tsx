import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import "./css/NumberFilter.css";

interface NumberFilterProps {
  name: string;
  label: string;
  value: string | number;
  onChange: (name: string, value: string) => void;
  min?: number;
  max?: number;
  step?: number | string;
  id?: string;
  stacked?: boolean;
}

function decimalsFromStep(step: number | string | undefined): number {
  const s = String(step ?? 1);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : Math.min(6, s.length - dot - 1);
}

function clamp(n: number, min: number | undefined, max: number | undefined): number {
  let x = n;
  if (min !== undefined) x = Math.max(Number(min), x);
  if (max !== undefined) x = Math.min(Number(max), x);
  return x;
}

function formatByStep(n: number, step: number | string | undefined): string {
  const d = decimalsFromStep(step);
  return Number(n).toFixed(d);
}

export default function NumberFilter({
  name,
  label,
  value,
  onChange,
  min,
  max,
  step,
  id,
  stacked = false,
}: NumberFilterProps) {
  const inputId = id ?? `param-${name}`;
  const containerClassName = stacked ? "number-filter-container stacked" : "number-filter-container";

  const bump = (delta: number) => {
    const curr = Number(value ?? 0);
    let next = curr + Number(delta);
    next = clamp(next, min, max);
    onChange(name, formatByStep(next, step));
  };

  return (
    <div className={containerClassName}>
      <label className="number-filter-label" htmlFor={inputId}>
        {label}
      </label>
      <div className={`number-filter-stepper${stacked ? " is-stacked" : ""}`}>
        {stacked ? (
          <>
            <input
              className="number-filter-input"
              id={inputId}
              name={name}
              type="number"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(name, e.target.value)}
            />
            <div className="number-filter-chevron-box" aria-hidden="false">
              <button
                type="button"
                className="icon-btn chevron-btn"
                onClick={() => bump(Number(step ?? 1))}
                aria-label={`Increase ${label}`}
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                className="icon-btn chevron-btn"
                onClick={() => bump(-Number(step ?? 1))}
                aria-label={`Decrease ${label}`}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="icon-btn"
              onClick={() => bump(Number(step ?? 1))}
              aria-label={`Increase ${label}`}
            >
              <Plus className="plus-sign" size={20} />
            </button>
            <input
              className="number-filter-input"
              id={inputId}
              name={name}
              type="number"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(name, e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => bump(-Number(step ?? 1))}
              aria-label={`Decrease ${label}`}
            >
              <Minus className="minus-sign" size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
