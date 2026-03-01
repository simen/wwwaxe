// src/wwwaxe.ts
import { parseDocument } from "htmlparser2";
import { Text, isTag, isText, hasChildren } from "domhandler";
import render from "dom-serializer";
import { removeElement, textContent, getChildren } from "domutils";
var REMOVE_TAGS = /* @__PURE__ */ new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "link",
  "iframe",
  // Common non-content elements
  "template"
]);
var UNWRAP_TAGS = /* @__PURE__ */ new Set([
  "span",
  "div",
  "font",
  "center",
  "b",
  "i",
  "u",
  "em",
  "strong",
  "small",
  "big",
  "mark",
  "sub",
  "sup",
  "abbr",
  "cite",
  "code",
  "kbd",
  "samp",
  "var",
  "del",
  "ins",
  "s",
  "strike",
  "wbr",
  "bdi",
  "bdo"
]);
var MARKDOWN_PRESERVE_TAGS = /* @__PURE__ */ new Set([
  "strong",
  "b",
  "em",
  "i",
  "code",
  "del",
  "s",
  "strike"
]);
var KEEP_TAGS = /* @__PURE__ */ new Set([
  // Document
  "html",
  "head",
  "body",
  // Meta
  "title",
  "meta",
  "base",
  // Sectioning
  "header",
  "footer",
  "main",
  "nav",
  "article",
  "section",
  "aside",
  "hgroup",
  "search",
  "address",
  // Headings
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  // Content
  "p",
  "blockquote",
  "pre",
  "figure",
  "figcaption",
  "hr",
  "br",
  // Lists
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "menu",
  // Tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  // Forms
  "form",
  "fieldset",
  "legend",
  "label",
  "input",
  "textarea",
  "select",
  "option",
  "optgroup",
  "button",
  "output",
  "datalist",
  // Media
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "track",
  // Links
  "a",
  // Other semantic
  "details",
  "summary",
  "dialog",
  "time"
]);
var CONTENT_ATTRIBUTES = /* @__PURE__ */ new Set([
  // Links & media
  "href",
  "src",
  "srcset",
  "alt",
  "poster",
  // Semantics
  "role",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "title",
  "lang",
  "dir",
  "translate",
  // Form semantics
  "type",
  "name",
  "value",
  "placeholder",
  "for",
  "action",
  "method",
  "required",
  "disabled",
  "checked",
  "selected",
  "readonly",
  "min",
  "max",
  "step",
  "pattern",
  "maxlength",
  "minlength",
  "multiple",
  "rows",
  "cols",
  // Table semantics
  "colspan",
  "rowspan",
  "scope",
  "headers",
  // Meta
  "content",
  "property",
  "charset",
  "http-equiv",
  // Media
  "width",
  "height",
  "controls",
  "autoplay",
  "loop",
  "muted",
  // Time
  "datetime",
  // Details
  "open",
  // Lists
  "start",
  "reversed"
]);
var CHROME_TAGS = /* @__PURE__ */ new Set([
  "header",
  "nav",
  "footer",
  "aside",
  "dialog"
]);
var CHROME_ROLES = /* @__PURE__ */ new Set([
  "banner",
  "navigation",
  "complementary",
  "contentinfo",
  "search"
]);
var WELL_KNOWN_CONTENT_IDS = [
  "main-content",
  "content",
  "main",
  "page-content",
  "site-content"
];
function isEventAttribute(name) {
  return name.startsWith("on") && name.length > 2;
}
function isDataAttribute(name) {
  return name.startsWith("data-");
}
function getUnwrapTags(options) {
  const markdown = options.markdown !== false;
  if (!markdown) return UNWRAP_TAGS;
  const tags = new Set(UNWRAP_TAGS);
  for (const tag of MARKDOWN_PRESERVE_TAGS) {
    tags.delete(tag);
  }
  return tags;
}
function findElement(node, tagName) {
  if (isTag(node) && node.tagName.toLowerCase() === tagName) {
    return node;
  }
  if (hasChildren(node)) {
    for (const child of getChildren(node)) {
      const found = findElement(child, tagName);
      if (found) return found;
    }
  }
  return null;
}
function findElements(node, predicate) {
  const results = [];
  if (isTag(node) && predicate(node)) {
    results.push(node);
  }
  if (hasChildren(node)) {
    for (const child of getChildren(node)) {
      results.push(...findElements(child, predicate));
    }
  }
  return results;
}
function findById(node, id) {
  if (isTag(node) && node.attribs.id === id) {
    return node;
  }
  if (hasChildren(node)) {
    for (const child of getChildren(node)) {
      const found = findById(child, id);
      if (found) return found;
    }
  }
  return null;
}
function extractFrontmatter(doc) {
  const data = {};
  const head = findElement(doc, "head");
  if (!head) return data;
  const titleEl = findElement(head, "title");
  if (titleEl) {
    const text = textContent(titleEl).trim();
    if (text) data.title = text;
  }
  const metas = findElements(head, (el) => el.tagName.toLowerCase() === "meta");
  const links = findElements(head, (el) => el.tagName.toLowerCase() === "link");
  for (const meta of metas) {
    const name = (meta.attribs.name || "").toLowerCase();
    if (name === "description" && meta.attribs.content) {
      data.description = meta.attribs.content.trim();
      break;
    }
  }
  for (const link of links) {
    const rel = (link.attribs.rel || "").toLowerCase();
    if (rel === "canonical" && link.attribs.href) {
      data.url = link.attribs.href.trim();
      break;
    }
  }
  if (!data.url) {
    for (const meta of metas) {
      const property = (meta.attribs.property || "").toLowerCase();
      if (property === "og:url" && meta.attribs.content) {
        data.url = meta.attribs.content.trim();
        break;
      }
    }
  }
  for (const meta of metas) {
    const property = (meta.attribs.property || "").toLowerCase();
    if (property === "og:image" && meta.attribs.content) {
      data.image = meta.attribs.content.trim();
      break;
    }
  }
  return data;
}
function yamlEscape(value) {
  if (value.includes(": ") || value.includes("\n") || value.includes('"') || value.includes("'") || value.includes("[") || value.includes("]") || value.includes("{") || value.includes("}") || value.includes("#") || value.includes("&") || value.includes("*") || value.includes("!") || value.includes("|") || value.includes(">") || value.includes("%") || value.includes("@") || value.includes("`")) {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return '"' + escaped + '"';
  }
  return value;
}
function buildFrontmatter(data) {
  const lines = [];
  if (data.title) lines.push("title: " + yamlEscape(data.title));
  if (data.description) lines.push("description: " + yamlEscape(data.description));
  if (data.url) lines.push("url: " + yamlEscape(data.url));
  if (data.image) lines.push("image: " + yamlEscape(data.image));
  if (lines.length === 0) return "";
  return "---\n" + lines.join("\n") + "\n---";
}
function removeDocumentWrappers(doc) {
  const htmlEl = findElement(doc, "html");
  if (!htmlEl) return;
  const bodyEl = findElement(htmlEl, "body");
  const headEl = findElement(htmlEl, "head");
  if (headEl) {
    removeElement(headEl);
  }
  if (bodyEl) {
    unwrapElement(bodyEl);
  }
  const htmlEl2 = findElement(doc, "html");
  if (htmlEl2) {
    unwrapElement(htmlEl2);
  }
}
function removeChromeElements(node) {
  if (!hasChildren(node)) return;
  const children = [...getChildren(node)];
  for (const child of children) {
    if (isTag(child)) {
      const tag = child.tagName.toLowerCase();
      const role = (child.attribs.role || "").toLowerCase();
      if (CHROME_TAGS.has(tag) || CHROME_ROLES.has(role)) {
        removeElement(child);
        continue;
      }
    }
    removeChromeElements(child);
  }
}
function findCoreContent(doc) {
  const article = findElement(doc, "article");
  if (article) return article;
  const skipLinks = findElements(doc, (el) => {
    if (el.tagName.toLowerCase() !== "a") return false;
    const href = el.attribs.href || "";
    if (!href.startsWith("#")) return false;
    const text = textContent(el).toLowerCase();
    return text.includes("skip");
  });
  for (const link of skipLinks) {
    const targetId = (link.attribs.href || "").slice(1);
    if (targetId) {
      const target = findById(doc, targetId);
      if (target) return target;
    }
  }
  for (const id of WELL_KNOWN_CONTENT_IDS) {
    const el = findById(doc, id);
    if (el) return el;
  }
  return null;
}
function stripChrome(doc) {
  removeChromeElements(doc);
  const mainEl = findElement(doc, "main") || findElements(doc, (el) => (el.attribs.role || "").toLowerCase() === "main")[0] || null;
  if (mainEl) {
    return;
  }
  const coreContent = findCoreContent(doc);
  if (coreContent) {
    const mutableDoc = doc;
    coreContent.parent = doc;
    mutableDoc.children = [coreContent];
    coreContent.prev = null;
    coreContent.next = null;
  }
}
function isUsefulMeta(el) {
  const name = (el.attribs.name || "").toLowerCase();
  const property = (el.attribs.property || "").toLowerCase();
  const httpEquiv = (el.attribs["http-equiv"] || "").toLowerCase();
  if (["description", "author", "keywords", "robots", "viewport"].includes(name)) return true;
  if (property.startsWith("og:")) return true;
  if (name.startsWith("twitter:")) return true;
  if (el.attribs.charset) return true;
  if (httpEquiv === "content-type") return true;
  return false;
}
function isUsefulLink(el) {
  const rel = (el.attribs.rel || "").toLowerCase();
  return rel === "canonical" || rel === "alternate";
}
function stripAttributes(el, options) {
  const newAttribs = {};
  for (const [key, value] of Object.entries(el.attribs)) {
    const lowerKey = key.toLowerCase();
    if (isEventAttribute(lowerKey)) continue;
    if (lowerKey === "style") continue;
    if (lowerKey === "class") {
      if (options.keepClasses) {
        newAttribs[key] = value;
      }
      continue;
    }
    if (lowerKey === "id") {
      if (options.keepIds !== false) {
        newAttribs[key] = value;
      }
      continue;
    }
    if (isDataAttribute(lowerKey)) {
      if (options.keepDataAttributes) {
        newAttribs[key] = value;
      }
      continue;
    }
    if (CONTENT_ATTRIBUTES.has(lowerKey)) {
      newAttribs[key] = value;
    }
  }
  el.attribs = newAttribs;
}
function isHidden(el, options) {
  if (el.attribs.hidden !== void 0) return true;
  if (!options.keepAriaHidden && el.attribs["aria-hidden"] === "true") return true;
  const style = el.attribs.style || "";
  if (style.includes("display:none") || style.includes("display: none")) return true;
  if (style.includes("visibility:hidden") || style.includes("visibility: hidden")) return true;
  return false;
}
function hasMeaningfulContent(node) {
  if (isText(node)) {
    return node.data.trim().length > 0;
  }
  if (isTag(node)) {
    const tag = node.tagName.toLowerCase();
    if (["img", "input", "br", "hr", "video", "audio", "source", "track"].includes(tag)) {
      return true;
    }
    if (hasChildren(node)) {
      return getChildren(node).some((child) => hasMeaningfulContent(child));
    }
  }
  return false;
}
function hasContentAttributes(el, options = {}) {
  for (const key of Object.keys(el.attribs)) {
    const lowerKey = key.toLowerCase();
    if (CONTENT_ATTRIBUTES.has(lowerKey)) return true;
    if (lowerKey === "id" && options.keepIds !== false) return true;
    if (lowerKey === "class" && options.keepClasses) return true;
    if (isDataAttribute(lowerKey) && options.keepDataAttributes) return true;
  }
  return false;
}
function processNode(node, options, unwrapTags) {
  if (node.type === "comment") {
    removeElement(node);
    return;
  }
  if (!isTag(node)) return;
  const tag = node.tagName.toLowerCase();
  if (REMOVE_TAGS.has(tag)) {
    if (tag === "link" && isUsefulLink(node)) {
      stripAttributes(node, options);
      return;
    }
    removeElement(node);
    return;
  }
  if (isHidden(node, options)) {
    removeElement(node);
    return;
  }
  if (tag === "meta" && !isUsefulMeta(node)) {
    removeElement(node);
    return;
  }
  if (hasChildren(node)) {
    const children = [...getChildren(node)];
    for (const child of children) {
      processNode(child, options, unwrapTags);
    }
  }
  stripAttributes(node, options);
  if (!KEEP_TAGS.has(tag)) {
    if (unwrapTags.has(tag) && !hasContentAttributes(node, options)) {
      unwrapElement(node);
      return;
    }
    if (!hasMeaningfulContent(node)) {
      removeElement(node);
      return;
    }
  }
  const voidElements = /* @__PURE__ */ new Set(["br", "hr", "img", "input", "meta", "source", "track", "col", "base"]);
  const headElements = /* @__PURE__ */ new Set(["head", "html", "body", "title"]);
  if (!voidElements.has(tag) && !headElements.has(tag) && !hasMeaningfulContent(node)) {
    removeElement(node);
  }
}
function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent || !hasChildren(parent)) return;
  const children = getChildren(el);
  if (children.length === 0) {
    removeElement(el);
    return;
  }
  const parentChildren = getChildren(parent);
  const index = parentChildren.indexOf(el);
  if (index === -1) {
    removeElement(el);
    return;
  }
  for (const child of children) {
    child.parent = parent;
  }
  const mutableParent = parent;
  mutableParent.children = [
    ...parentChildren.slice(0, index),
    ...children,
    ...parentChildren.slice(index + 1)
  ];
  const allChildren = getChildren(parent);
  for (let i = 0; i < allChildren.length; i++) {
    const child = allChildren[i];
    child.prev = i > 0 ? allChildren[i - 1] : null;
    child.next = i < allChildren.length - 1 ? allChildren[i + 1] : null;
  }
}
function replaceWithText(el, text) {
  const parent = el.parentNode;
  if (!parent || !hasChildren(parent)) return;
  const textNode = new Text(text);
  textNode.parent = parent;
  const parentChildren = getChildren(parent);
  const index = parentChildren.indexOf(el);
  if (index === -1) return;
  const mutableParent = parent;
  mutableParent.children = [
    ...parentChildren.slice(0, index),
    textNode,
    ...parentChildren.slice(index + 1)
  ];
  const allChildren = getChildren(parent);
  for (let i = 0; i < allChildren.length; i++) {
    const child = allChildren[i];
    child.prev = i > 0 ? allChildren[i - 1] : null;
    child.next = i < allChildren.length - 1 ? allChildren[i + 1] : null;
  }
}
function getMdTextContent(node) {
  if (isText(node)) return node.data;
  if (hasChildren(node)) {
    return getChildren(node).map(getMdTextContent).join("");
  }
  return "";
}
function markdownRewrite(node) {
  if (!hasChildren(node) && !isTag(node)) return;
  if (hasChildren(node)) {
    const children = [...getChildren(node)];
    for (const child of children) {
      markdownRewrite(child);
    }
  }
  if (!isTag(node)) return;
  const el = node;
  const tag = el.tagName.toLowerCase();
  const BACKTICK = String.fromCharCode(96);
  const TRIPLE_BACKTICK = BACKTICK + BACKTICK + BACKTICK;
  switch (tag) {
    case "strong":
    case "b": {
      const text = getMdTextContent(el);
      replaceWithText(el, "**" + text + "**");
      break;
    }
    case "em":
    case "i": {
      const text = getMdTextContent(el);
      replaceWithText(el, "*" + text + "*");
      break;
    }
    case "del":
    case "s":
    case "strike": {
      const text = getMdTextContent(el);
      replaceWithText(el, "~~" + text + "~~");
      break;
    }
    case "a": {
      const href = el.attribs.href || "";
      const text = getMdTextContent(el);
      replaceWithText(el, "[" + text + "](" + href + ")");
      break;
    }
    case "img": {
      const src = el.attribs.src || "";
      const alt = el.attribs.alt || "";
      replaceWithText(el, "![" + alt + "](" + src + ")");
      break;
    }
    case "code": {
      const parent = el.parentNode;
      if (parent && isTag(parent) && parent.tagName.toLowerCase() === "pre") {
        break;
      }
      const text = getMdTextContent(el);
      replaceWithText(el, BACKTICK + text + BACKTICK);
      break;
    }
    case "pre": {
      const children = getChildren(el);
      let text;
      if (children.length === 1 && isTag(children[0]) && children[0].tagName.toLowerCase() === "code") {
        text = getMdTextContent(children[0]);
      } else {
        text = getMdTextContent(el);
      }
      replaceWithText(el, "\n" + TRIPLE_BACKTICK + "\n" + text + "\n" + TRIPLE_BACKTICK + "\n");
      break;
    }
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = parseInt(tag[1]);
      const prefix = "#".repeat(level);
      const text = getMdTextContent(el);
      replaceWithText(el, "\n" + prefix + " " + text + "\n");
      break;
    }
    case "blockquote": {
      const text = getMdTextContent(el).trim();
      const lines = text.split("\n");
      const quoted = lines.map((line) => "> " + line).join("\n");
      replaceWithText(el, quoted);
      break;
    }
    case "ul": {
      const items = getChildren(el).filter((c) => isTag(c) && c.tagName.toLowerCase() === "li");
      const lines = items.map((item) => "- " + getMdTextContent(item).trim());
      replaceWithText(el, lines.join("\n") + "\n");
      break;
    }
    case "ol": {
      const items = getChildren(el).filter((c) => isTag(c) && c.tagName.toLowerCase() === "li");
      const lines = items.map((item, i) => i + 1 + ". " + getMdTextContent(item).trim());
      replaceWithText(el, lines.join("\n") + "\n");
      break;
    }
    case "hr": {
      replaceWithText(el, "\n---\n");
      break;
    }
    case "br": {
      replaceWithText(el, "\n");
      break;
    }
  }
}
function collapseWhitespace(node) {
  if (isText(node)) {
    node.data = node.data.replace(/[\t\n\r]+/g, " ").replace(/ {2,}/g, " ");
    return;
  }
  if (hasChildren(node)) {
    for (const child of getChildren(node)) {
      collapseWhitespace(child);
    }
  }
}
function cleanTextNodes(node) {
  if (!hasChildren(node)) return;
  const children = [...getChildren(node)];
  for (const child of children) {
    if (isText(child)) {
      if (child.data.trim().length === 0 && child.data.length > 1) {
        child.data = " ";
      }
    } else {
      cleanTextNodes(child);
    }
  }
}
function wwwaxe(html, options = {}) {
  const markdown = options.markdown !== false;
  const unwrapTags = getUnwrapTags(options);
  const doc = parseDocument(html, {
    decodeEntities: true
  });
  const frontmatterData = extractFrontmatter(doc);
  const children = [...getChildren(doc)];
  for (const child of children) {
    processNode(child, options, unwrapTags);
  }
  removeDocumentWrappers(doc);
  if (options.core) {
    stripChrome(doc);
  }
  collapseWhitespace(doc);
  cleanTextNodes(doc);
  if (markdown) {
    markdownRewrite(doc);
  }
  let result = render(doc, {
    encodeEntities: "utf8",
    selfClosingTags: true
  });
  if (markdown) {
    result = result.replace(/&gt; /g, "> ");
  }
  result = result.replace(/<!DOCTYPE[^>]*>/gi, "");
  result = result.replace(/\n{3,}/g, "\n").trim();
  const frontmatter = buildFrontmatter(frontmatterData);
  if (frontmatter) {
    result = frontmatter + "\n" + result;
  }
  return result;
}
export {
  wwwaxe
};
//# sourceMappingURL=index.mjs.map