import { useEffect, useRef } from "react";
import { sanitizeRichText, toRichTextHtml } from "../utils/richText.js";

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  id,
  className = "",
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const normalized = toRichTextHtml(value);
    if (editorRef.current.innerHTML !== normalized) {
      editorRef.current.innerHTML = normalized;
    }
  }, [value]);

  const emitChange = () => {
    if (!editorRef.current) {
      return;
    }
    onChange(sanitizeRichText(editorRef.current.innerHTML));
  };

  const handleAddLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const url = window.prompt("Enter a URL to link");
    if (!url) {
      return;
    }
    document.execCommand("createLink", false, url);
    emitChange();
  };

  return (
    <div className={`rich-text-editor ${className}`.trim()}>
      <div className="rich-text-editor__toolbar">
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={handleAddLink}
        >
          Add link
        </button>
        <span className="rich-text-editor__hint">Use Enter for a new line.</span>
      </div>
      <div
        id={id}
        ref={editorRef}
        className="rich-text-editor__input"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  );
}
