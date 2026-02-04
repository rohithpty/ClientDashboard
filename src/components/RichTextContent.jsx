import { toRichTextHtml } from "../utils/richText.js";

export default function RichTextContent({ html, className = "" }) {
  return (
    <div
      className={`rich-text ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: toRichTextHtml(html) }}
    />
  );
}
