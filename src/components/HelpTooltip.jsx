import { useEffect, useRef, useState } from "react";

export default function HelpTooltip({ id, text, placement = "top" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const bubbleRef = useRef(null);
  const [shift, setShift] = useState(0);

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

  useEffect(() => {
    if (!open) {
      return;
    }
    const updateShift = () => {
      const bubble = bubbleRef.current;
      if (!bubble) {
        return;
      }
      const rect = bubble.getBoundingClientRect();
      const boundary =
        wrapperRef.current?.closest("[data-tooltip-boundary]") ?? document.documentElement;
      const boundaryRect = boundary.getBoundingClientRect();
      const padding = 12;
      let nextShift = 0;
      if (rect.left < boundaryRect.left + padding) {
        nextShift = boundaryRect.left + padding - rect.left;
      } else if (rect.right > boundaryRect.right - padding) {
        nextShift = boundaryRect.right - padding - rect.right;
      }
      setShift(nextShift);
    };
    updateShift();
    window.addEventListener("resize", updateShift);
    return () => window.removeEventListener("resize", updateShift);
  }, [open, text]);

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
        ref={bubbleRef}
        style={{ "--tooltip-shift": `${shift}px` }}
      >
        {text}
      </span>
    </span>
  );
}
