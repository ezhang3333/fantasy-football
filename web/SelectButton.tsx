import type { ReactNode } from "react";
import "./css/SelectButton.css";

interface SelectButtonProps {
  value: string;
  selected: boolean;
  onClick: (value: string) => void;
  children?: ReactNode;
  containerClassName?: string;
  buttonClassName?: string;
}

export default function SelectButton({
  value,
  selected,
  onClick,
  children,
  containerClassName = "select-button-container",
  buttonClassName = "select-button",
}: SelectButtonProps) {
  return (
    <div className={containerClassName}>
      <button
        type="button"
        className={`${buttonClassName}${selected ? " is-selected" : ""}`}
        onClick={() => onClick(value)}
        aria-pressed={selected}
      >
        {children}
      </button>
    </div>
  );
}
