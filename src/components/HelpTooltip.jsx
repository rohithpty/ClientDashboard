import { useEffect, useRef, useState } from "react";

export default function HelpTooltip({ id, text, placement = "top" }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const bubbleRef = useRef(null);
  const [position, setPosition] = useState({ left: 0, top: 0, arrowLeft: 0 });

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
    const updatePosition = () => {
      const bubble = bubbleRef.current;
      const wrapper = wrapperRef.current;
      if (!bubble || !wrapper) {
        return;
      }
      const bubbleRect = bubble.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const padding = 12;
      const preferredLeft =
        wrapperRect.left + wrapperRect.width / 2 - bubbleRect.width / 2;
      const minLeft = padding;
      const maxLeft = window.innerWidth - padding - bubbleRect.width;
      const left = Math.min(Math.max(preferredLeft, minLeft), maxLeft);
      const top = wrapperRect.bottom + 8;
      const arrowLeft = Math.min(
        Math.max(wrapperRect.left + wrapperRect.width / 2 - left, 12),
        bubbleRect.width - 12,
      );
      setPosition({ left, top, arrowLeft });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
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
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          "--tooltip-arrow-left": `${position.arrowLeft}px`,
        }}
      >
        {text}
      </span>
    </span>
  );
}
