import { parseDocument } from 'htmlparser2'
import { Element, Text, Comment, Node, Document, ChildNode, isTag, isText, hasChildren } from 'domhandler'
import render from 'dom-serializer'
import { removeElement, textContent, getChildren } from 'domutils'

export interface WwwaxeOptions {
  /** Keep data-* attributes (default: false) */
  keepDataAttributes?: boolean
  /** Keep id attributes (default: false) */
  keepIds?: boolean
  /** Keep class attributes (default: false) */
  keepClasses?: boolean
  /** Keep aria-hidden elements (default: false) */
  keepAriaHidden?: boolean
}

/** Tags to remove entirely (tag + all children) */
const REMOVE_TAGS = new Set([
  'script', 'style', 'noscript', 'svg', 'link', 'iframe',
  // Common non-content elements
  'template',
])

/** Tags that are purely presentational wrappers — unwrap children, discard tag */
const UNWRAP_TAGS = new Set([
  'span', 'div', 'font', 'center', 'b', 'i', 'u', 'em', 'strong', 'small',
  'big', 'mark', 'sub', 'sup', 'abbr', 'cite', 'code', 'kbd', 'samp', 'var',
  'del', 'ins', 's', 'strike', 'wbr', 'bdi', 'bdo',
])

/** Structural tags we always keep */
const KEEP_TAGS = new Set([
  // Document
  'html', 'head', 'body',
  // Meta
  'title', 'meta', 'base',
  // Sectioning
  'header', 'footer', 'main', 'nav', 'article', 'section', 'aside',
  'hgroup', 'search', 'address',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Content
  'p', 'blockquote', 'pre', 'figure', 'figcaption', 'hr', 'br',
  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'menu',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Forms
  'form', 'fieldset', 'legend', 'label', 'input', 'textarea', 'select',
  'option', 'optgroup', 'button', 'output', 'datalist',
  // Media
  'img', 'picture', 'source', 'video', 'audio', 'track',
  // Links
  'a',
  // Other semantic
  'details', 'summary', 'dialog', 'time',
])

/** Attributes to keep — everything else is stripped */
const CONTENT_ATTRIBUTES = new Set([
  // Links & media
  'href', 'src', 'srcset', 'alt', 'poster',
  // Semantics
  'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'title', 'lang', 'dir', 'translate',
  // Form semantics
  'type', 'name', 'value', 'placeholder', 'for', 'action', 'method',
  'required', 'disabled', 'checked', 'selected', 'readonly',
  'min', 'max', 'step', 'pattern', 'maxlength', 'minlength',
  'multiple', 'rows', 'cols',
  // Table semantics
  'colspan', 'rowspan', 'scope', 'headers',
  // Meta
  'content', 'property', 'charset', 'http-equiv',
  // Media
  'width', 'height', 'controls', 'autoplay', 'loop', 'muted',
  // Time
  'datetime',
  // Details
  'open',
  // Lists
  'start', 'reversed',
])

/** Event handler attribute prefixes */
const EVENT_PREFIXES = ['on']

function isEventAttribute(name: string): boolean {
  return name.startsWith('on') && name.length > 2
}

function isDataAttribute(name: string): boolean {
  return name.startsWith('data-')
}

/**
 * Check if a meta tag contains useful content information
 */
function isUsefulMeta(el: Element): boolean {
  const name = (el.attribs.name || '').toLowerCase()
  const property = (el.attribs.property || '').toLowerCase()
  const httpEquiv = (el.attribs['http-equiv'] || '').toLowerCase()

  // Useful meta names
  if (['description', 'author', 'keywords', 'robots', 'viewport'].includes(name)) return true
  // Open Graph
  if (property.startsWith('og:')) return true
  // Twitter cards
  if (name.startsWith('twitter:')) return true
  // Charset
  if (el.attribs.charset) return true
  // Content-Type
  if (httpEquiv === 'content-type') return true

  return false
}

/**
 * Check if a link tag should be kept (only canonical and alternate)
 */
function isUsefulLink(el: Element): boolean {
  const rel = (el.attribs.rel || '').toLowerCase()
  return rel === 'canonical' || rel === 'alternate'
}

/**
 * Strip attributes from an element, keeping only content-relevant ones
 */
function stripAttributes(el: Element, options: WwwaxeOptions): void {
  const newAttribs: Record<string, string> = {}

  for (const [key, value] of Object.entries(el.attribs)) {
    const lowerKey = key.toLowerCase()

    // Always skip event handlers
    if (isEventAttribute(lowerKey)) continue

    // Always skip style
    if (lowerKey === 'style') continue

    // Conditionally skip or keep
    if (lowerKey === 'class') {
      if (options.keepClasses) { newAttribs[key] = value }
      continue
    }
    if (lowerKey === 'id') {
      if (options.keepIds) { newAttribs[key] = value }
      continue
    }
    if (isDataAttribute(lowerKey)) {
      if (options.keepDataAttributes) { newAttribs[key] = value }
      continue
    }

    // Keep if in allowlist
    if (CONTENT_ATTRIBUTES.has(lowerKey)) {
      newAttribs[key] = value
    }
  }

  el.attribs = newAttribs
}

/**
 * Check if an element is hidden
 */
function isHidden(el: Element, options: WwwaxeOptions): boolean {
  if (el.attribs.hidden !== undefined) return true
  if (!options.keepAriaHidden && el.attribs['aria-hidden'] === 'true') return true
  // Check for display:none or visibility:hidden in inline styles
  const style = el.attribs.style || ''
  if (style.includes('display:none') || style.includes('display: none')) return true
  if (style.includes('visibility:hidden') || style.includes('visibility: hidden')) return true
  return false
}

/**
 * Check if a node has any meaningful text content
 */
function hasMeaningfulContent(node: Node): boolean {
  if (isText(node)) {
    return node.data.trim().length > 0
  }
  if (isTag(node)) {
    // Self-closing content elements are meaningful
    const tag = node.tagName.toLowerCase()
    if (['img', 'input', 'br', 'hr', 'video', 'audio', 'source', 'track'].includes(tag)) {
      return true
    }
    // Check children
    if (hasChildren(node)) {
      return getChildren(node).some(child => hasMeaningfulContent(child))
    }
  }
  return false
}

/**
 * Check if an element has any content-relevant attributes worth preserving
 */
function hasContentAttributes(el: Element, options: WwwaxeOptions = {}): boolean {
  for (const key of Object.keys(el.attribs)) {
    const lowerKey = key.toLowerCase()
    if (CONTENT_ATTRIBUTES.has(lowerKey)) return true
    if (lowerKey === 'id' && options.keepIds) return true
    if (lowerKey === 'class' && options.keepClasses) return true
    if (isDataAttribute(lowerKey) && options.keepDataAttributes) return true
  }
  return false
}

/**
 * Process the DOM tree, stripping non-content nodes
 */
function processNode(node: Node, options: WwwaxeOptions): void {
  // Remove comments
  if (node.type === 'comment') {
    removeElement(node as ChildNode)
    return
  }

  if (!isTag(node)) return

  const tag = node.tagName.toLowerCase()

  // Remove entire tag + children for blacklisted tags
  if (REMOVE_TAGS.has(tag)) {
    // Exception: keep useful link tags
    if (tag === 'link' && isUsefulLink(node)) {
      stripAttributes(node, options)
      return
    }
    removeElement(node)
    return
  }

  // Remove hidden elements
  if (isHidden(node, options)) {
    removeElement(node)
    return
  }

  // Filter meta tags — only keep useful ones
  if (tag === 'meta' && !isUsefulMeta(node)) {
    removeElement(node)
    return
  }

  // Process children first (bottom-up)
  if (hasChildren(node)) {
    // Copy array since we may modify during iteration
    const children = [...getChildren(node)]
    for (const child of children) {
      processNode(child, options)
    }
  }

  // Strip attributes on all kept elements
  stripAttributes(node, options)

  // For tags not in KEEP_TAGS and not in UNWRAP_TAGS, decide based on whether
  // they have meaningful content
  if (!KEEP_TAGS.has(tag)) {
    if (UNWRAP_TAGS.has(tag) && !hasContentAttributes(node, options)) {
      // Unwrap: replace element with its children (only if no meaningful attributes)
      unwrapElement(node)
      return
    }
    // Unknown tag — keep if it has content, otherwise remove
    if (!hasMeaningfulContent(node)) {
      removeElement(node)
      return
    }
    // Keep unknown tags that have content (custom elements, etc.)
  }

  // Remove empty structural elements (except void elements and head-level)
  const voidElements = new Set(['br', 'hr', 'img', 'input', 'meta', 'source', 'track', 'col', 'base'])
  const headElements = new Set(['head', 'html', 'body', 'title'])
  if (!voidElements.has(tag) && !headElements.has(tag) && !hasMeaningfulContent(node)) {
    removeElement(node)
  }
}

/**
 * Replace an element with its children (unwrap)
 */
function unwrapElement(el: Element): void {
  const parent = el.parentNode
  if (!parent || !hasChildren(parent)) return

  const children = getChildren(el)
  if (children.length === 0) {
    removeElement(el)
    return
  }

  // Insert children before the element
  const parentChildren = getChildren(parent)
  const index = parentChildren.indexOf(el)
  if (index === -1) {
    removeElement(el)
    return
  }

  for (const child of children) {
    child.parent = parent
  }

  const mutableParent = parent as any
  mutableParent.children = [
    ...parentChildren.slice(0, index),
    ...children,
    ...parentChildren.slice(index + 1)
  ]

  // Fix prev/next links
  const allChildren = getChildren(parent)
  for (let i = 0; i < allChildren.length; i++) {
    const child = allChildren[i] as any
    child.prev = i > 0 ? allChildren[i - 1] : null
    child.next = i < allChildren.length - 1 ? allChildren[i + 1] : null
  }
}

/**
 * Collapse excessive whitespace in text nodes
 */
function collapseWhitespace(node: Node): void {
  if (isText(node)) {
    // Collapse runs of whitespace to single space
    node.data = node.data.replace(/[\t\n\r]+/g, ' ').replace(/ {2,}/g, ' ')
    return
  }
  if (hasChildren(node)) {
    for (const child of getChildren(node)) {
      collapseWhitespace(child)
    }
  }
}

/**
 * Remove empty text nodes and trim
 */
function cleanTextNodes(node: Node): void {
  if (!hasChildren(node)) return

  const children = [...getChildren(node)]
  for (const child of children) {
    if (isText(child)) {
      if (child.data.trim().length === 0 && child.data.length > 1) {
        // Replace large whitespace-only nodes with single space
        child.data = ' '
      }
    } else {
      cleanTextNodes(child)
    }
  }
}

/**
 * wwwaxe - Strip non-content data from HTML
 *
 * Takes raw HTML and returns condensed HTML retaining meaningful structure
 * and content while stripping scripts, styles, and presentational attributes.
 */
export function wwwaxe(html: string, options: WwwaxeOptions = {}): string {
  // Parse HTML
  const doc = parseDocument(html, {
    decodeEntities: true,
  })

  // Process all top-level nodes
  const children = [...getChildren(doc)]
  for (const child of children) {
    processNode(child, options)
  }

  // Collapse whitespace
  collapseWhitespace(doc)
  cleanTextNodes(doc)

  // Serialize back to HTML
  let result = render(doc, {
    encodeEntities: 'utf8',
    selfClosingTags: true,
  })

  // Final cleanup: collapse multiple blank lines
  result = result.replace(/\n{3,}/g, '\n').trim()

  return result
}
