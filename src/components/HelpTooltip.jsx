import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function HelpTooltip({ id, text, placement = "top" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const [position, setPosition] = useState(null);

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

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const updatePosition = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) {
        return;
      }
      const rect = wrapper.getBoundingClientRect();
      const padding = 12;
      const maxWidth = Math.min(320, window.innerWidth - padding * 2);
      const left = Math.min(
        Math.max(rect.left, padding),
        window.innerWidth - padding - maxWidth,
      );
      const top = rect.bottom + 8;
      setPosition({
        left,
        top,
        maxWidth,
        arrowLeft: Math.min(Math.max(rect.left + rect.width / 2 - left, 12), maxWidth - 12),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
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
        style={
          position
            ? {
                left: `${position.left}px`,
                top: `${position.top}px`,
                maxWidth: `${position.maxWidth}px`,
                "--tooltip-arrow-left": `${position.arrowLeft}px`,
              }
            : undefined
        }
      >
        {text}
      </span>
    </span>
  );
}
