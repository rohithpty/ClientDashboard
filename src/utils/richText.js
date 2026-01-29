const ALLOWED_TAGS = new Set(["A", "BR", "DIV", "P"]);
const LINK_ATTRIBUTES = new Set(["href", "target", "rel"]);

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(value);

export const sanitizeRichText = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  if (typeof DOMParser === "undefined") {
    return value;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");

  const walk = (node) => {
    const children = Array.from(node.childNodes);
    children.forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const tag = child.tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(tag)) {
        const textNode = doc.createTextNode(child.textContent ?? "");
        child.replaceWith(textNode);
        return;
      }

      Array.from(child.attributes).forEach((attr) => {
        if (tag === "A" && LINK_ATTRIBUTES.has(attr.name)) {
          return;
        }
        child.removeAttribute(attr.name);
      });

      if (tag === "A") {
        const href = child.getAttribute("href") ?? "";
        child.setAttribute("href", href);
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noreferrer");
      }

      walk(child);
    });
  };

  walk(doc.body);
  return doc.body.innerHTML;
};

export const toRichTextHtml = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  const raw = hasHtmlTags(value) ? value : value.replace(/\n/g, "<br />");
  return sanitizeRichText(raw);
};

export const isRichTextEmpty = (value) => {
  if (!value || typeof value !== "string") {
    return true;
  }
  if (typeof DOMParser === "undefined") {
    return value.trim().length === 0;
  }
  const doc = new DOMParser().parseFromString(toRichTextHtml(value), "text/html");
  const text = doc.body.textContent ?? "";
  const hasLink = doc.body.querySelector("a");
  return text.trim().length === 0 && !hasLink;
};
