import { useEffect, useRef, useState } from "react";

export default function HelpTooltip({ id, text, placement = "top" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={`help-tooltip help-tooltip--${placement} ${
        open ? "help-tooltip--open" : ""
      }`}
    >
      <button
        className="help-tooltip__icon"
        type="button"
        aria-describedby={id}
        aria-label="Help"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span
        id={id}
        role="tooltip"
        className="help-tooltip__bubble"
      >
        {text}
      </span>
    </span>
  );
}
