# wwwaxe 🪓

Strip non-content data from HTML for agentic consumption.

Modern web pages are bloated with scripts, styles, tracking pixels, and presentational markup that waste tokens when fed to LLMs. **wwwaxe** strips all of that away while preserving the meaningful document structure that plain-text or markdown conversion loses.

## Why not just convert to markdown?

Page structure often contains meaningful context — navigation hierarchies, semantic groupings, form layouts, table structures — that markdown conversion flattens or discards. wwwaxe keeps the HTML skeleton intact so agents can reason about page structure, not just content.

## Install

```bash
npm install wwwaxe
```

## Usage

```typescript
import { wwwaxe } from 'wwwaxe'

const condensed = wwwaxe(rawHtml)
// Returns condensed HTML with only content-bearing elements and attributes
```

## What it strips (v0)

- **`<script>`** tags and contents
- **`<style>`** tags and contents
- **`<noscript>`** tags and contents
- **`<svg>`** tags and contents (inline SVGs are typically decorative)
- **All `style` attributes**
- **All `class` attributes**
- **All `id` attributes**
- **All `data-*` attributes**
- **All event handler attributes** (`onclick`, `onload`, etc.)
- **Hidden elements** (`hidden`, `aria-hidden="true"`)
- **Comments**
- **Empty elements** that have no text content or meaningful children
- **Excessive whitespace** — collapses runs of whitespace

## What it keeps

- **Document structure** — headings, sections, articles, nav, main, aside, etc.
- **Text content** — all visible text
- **Links** — `<a href="...">` with their href
- **Images** — `<img src="..." alt="...">` with src and alt
- **Tables** — full table structure
- **Forms** — form structure with labels, inputs (type, name, placeholder, value)
- **Lists** — ordered and unordered lists
- **Semantic attributes** — `role`, `aria-label`, `alt`, `title`, `lang`, `dir`
- **Meta information** — `<title>`, `<meta name="description">`, `<meta property="og:*">`

## Example

Input (~50KB typical page):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>My Blog Post</title>
  <meta name="description" content="A great article">
  <link rel="stylesheet" href="/styles.css">
  <script src="/analytics.js"></script>
  <style>.hero { background: blue; }</style>
</head>
<body class="dark-theme" data-page="blog" onclick="track()">
  <nav id="main-nav" class="sticky-nav bg-white shadow-md">
    <a href="/" class="logo text-xl font-bold">My Site</a>
    <a href="/about" class="nav-link text-gray-600 hover:text-black">About</a>
  </nav>
  <main class="container mx-auto px-4">
    <article class="prose lg:prose-xl">
      <h1 class="text-4xl font-bold mb-4">Hello World</h1>
      <p class="text-gray-700 leading-relaxed">This is my <a href="/post" class="text-blue-500 underline">blog post</a>.</p>
      <img src="/photo.jpg" alt="A photo" class="rounded-lg shadow" loading="lazy" width="800" height="600">
    </article>
  </main>
  <script>console.log('tracking')</script>
</body>
</html>
```

Output (~500 bytes):
```html
<html lang="en"><head><title>My Blog Post</title><meta name="description" content="A great article"></head><body><nav><a href="/">My Site</a> <a href="/about">About</a></nav><main><article><h1>Hello World</h1><p>This is my <a href="/post">blog post</a>.</p><img src="/photo.jpg" alt="A photo"></article></main></body></html>
```

## API

### `wwwaxe(html: string, options?: WwwaxeOptions): string`

- **html** — Raw HTML string
- **options.keepDataAttributes** — Keep `data-*` attributes (default: `false`)
- **options.keepIds** — Keep `id` attributes (default: `false`)
- **options.keepClasses** — Keep `class` attributes (default: `false`)
- **options.keepAriaHidden** — Keep `aria-hidden` elements (default: `false`)

Returns condensed HTML string.

## License

MIT
