// Additional tests for RSC streaming reassembly and empty main fallback
// These describe blocks should be appended inside the outer describe('wwwaxe', ...) block
// in the existing test file, or used as a standalone file with the import below.

import { describe, it, expect } from 'vitest'
import { wwwaxe } from '../src/wwwaxe'

describe('wwwaxe - RSC and empty main enhancements', () => {
  describe('RSC streaming reassembly', () => {
    const rscPage = `<!DOCTYPE html>
<html>
<head>
<title>RSC Streaming Page</title>
<meta name="description" content="A page with RSC streaming content">
<link rel="canonical" href="https://example.com/rsc-page">
</head>
<body>
<header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
<main id="main"><!--$?--><template id="B:0"></template><!--/$--><!--$?--><template id="B:1"></template><!--/$--><!--$?--><template id="B:2"></template><!--/$--></main>
<footer><p>© 2026 Example</p></footer>
<script>$RC("B:0","S:0")</script>
<div hidden id="S:0"><section><h1>Welcome to RSC</h1><p>This is the hero section with enough content to be meaningful.</p></section></div>
<script>$RC("B:1","S:1")</script>
<div hidden id="S:1"><section><h2>Features</h2><p>Feature one is great. Feature two is even better.</p></section></div>
<script>$RC("B:2","S:2")</script>
<div hidden id="S:2"><section><h2>Get Started</h2><p>Sign up today and start building.</p></section></div>
</body>
</html>`

    it('mode 1: should contain all section content', () => {
      const result = wwwaxe(rscPage)
      expect(result).toContain('Welcome to RSC')
      expect(result).toContain('hero section')
      expect(result).toContain('Features')
      expect(result).toContain('Feature one is great')
      expect(result).toContain('Get Started')
      expect(result).toContain('Sign up today')
    })

    it('mode 2 (core): should contain content and strip chrome', () => {
      const result = wwwaxe(rscPage, { core: true })
      expect(result).toContain('Welcome to RSC')
      expect(result).toContain('Features')
      expect(result).toContain('Get Started')
      // Chrome should be stripped
      expect(result).not.toContain('<header')
      expect(result).not.toContain('<nav')
      expect(result).not.toContain('<footer')
      expect(result).not.toContain('© 2026')
    })

    it('template and hidden div elements should be gone from output', () => {
      const result = wwwaxe(rscPage)
      expect(result).not.toContain('<template')
      expect(result).not.toContain('id="B:')
      expect(result).not.toContain('id="S:')
      expect(result).not.toContain('<div hidden')
      // Suspense boundary comments should also be gone
      expect(result).not.toContain('$?')
      expect(result).not.toContain('/$')
      // RSC scripts should be gone
      expect(result).not.toContain('$RC')
    })

    it('frontmatter should still be extracted correctly', () => {
      const result = wwwaxe(rscPage)
      expect(result).toMatch(/^---\n/)
      expect(result).toContain('title: RSC Streaming Page')
      expect(result).toContain('description: A page with RSC streaming content')
      expect(result).toContain('url: https://example.com/rsc-page')
    })
  })

  describe('empty main fallback', () => {
    it('core mode should fall through to body-minus-chrome when main is empty', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>SPA</title></head>
<body>
<header><nav><a href="/">Home</a></nav></header>
<main id="app"></main>
<footer><p>© 2026</p></footer>
<div id="content"><article><h1>Real Content</h1><p>This is the actual page content that lives outside main.</p></article></div>
</body>
</html>`
      const result = wwwaxe(html, { core: true })
      // Should find the content outside main
      expect(result).toContain('Real Content')
      expect(result).toContain('actual page content')
      // Chrome should be stripped
      expect(result).not.toContain('<header')
      expect(result).not.toContain('<nav')
      expect(result).not.toContain('<footer')
      expect(result).not.toContain('© 2026')
    })

    it('core mode should keep main when it has meaningful content (> 50 chars)', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Normal Page</title></head>
<body>
<header><nav><a href="/">Home</a></nav></header>
<main><article><h1>Title</h1><p>This is a paragraph with enough content to be considered meaningful by the threshold check.</p></article></main>
<footer><p>© 2026</p></footer>
</body>
</html>`
      const result = wwwaxe(html, { core: true })
      expect(result).toContain('Title')
      expect(result).toContain('enough content')
      expect(result).not.toContain('<header')
      expect(result).not.toContain('<footer')
    })
  })

  describe('RSC detection - no false positives', () => {
    it('non-RSC page should behave unchanged', () => {
      const html = `<!DOCTYPE html>
<html>
<head><title>Normal Page</title></head>
<body>
<main>
<h1>Hello World</h1>
<p>This is a normal page with no RSC streaming.</p>
</main>
</body>
</html>`
      const result = wwwaxe(html)
      expect(result).toContain('Hello World')
      expect(result).toContain('normal page')
      expect(result).not.toContain('<template')
    })

    it('template elements without B:N pattern should still be removed', () => {
      const html = `<main><p>Content</p><template id="my-template"><p>Template content</p></template></main>`
      const result = wwwaxe(html)
      expect(result).toContain('Content')
      expect(result).not.toContain('<template')
      expect(result).not.toContain('Template content')
    })

    it('hidden attribute on non-RSC elements should still be stripped', () => {
      const html = `<main><p>Visible content here</p><div hidden><p>This should be hidden</p></div><p hidden>Also hidden</p></main>`
      const result = wwwaxe(html)
      expect(result).toContain('Visible content')
      expect(result).not.toContain('This should be hidden')
      expect(result).not.toContain('Also hidden')
    })

    it('hidden div without S:N id pattern should still be stripped', () => {
      const html = `<main><p>Visible</p><div hidden id="sidebar-collapsed"><p>Collapsed sidebar</p></div></main>`
      const result = wwwaxe(html)
      expect(result).toContain('Visible')
      expect(result).not.toContain('Collapsed sidebar')
    })
  })
})
