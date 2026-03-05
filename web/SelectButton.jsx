import "./css/SelectButton.css";

export default function SelectButton({
  value,
  selected,
  onClick,
  children,
  containerClassName = "select-button-container",
  buttonClassName = "select-button",
}) {
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
