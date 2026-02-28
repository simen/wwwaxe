import { describe, it, expect } from 'vitest'
import { wwwaxe } from '../src/wwwaxe'

describe('wwwaxe', () => {
  describe('script and style removal', () => {
    it('removes script tags and contents', () => {
      const html = '<div><p>Hello</p><script>alert("xss")</script></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('script')
      expect(result).not.toContain('alert')
      expect(result).toContain('Hello')
    })

    it('removes style tags and contents', () => {
      const html = '<div><p>Hello</p><style>.foo { color: red; }</style></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('style')
      expect(result).not.toContain('color')
      expect(result).toContain('Hello')
    })

    it('removes noscript tags', () => {
      const html = '<div><p>Hello</p><noscript>Enable JS</noscript></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('noscript')
      expect(result).not.toContain('Enable JS')
    })

    it('removes inline SVGs', () => {
      const html = '<div><p>Hello</p><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"/></svg></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('svg')
      expect(result).not.toContain('circle')
    })
  })

  describe('attribute stripping', () => {
    it('removes class attributes', () => {
      const html = '<p class="text-lg font-bold text-gray-700">Hello</p>'
      const result = wwwaxe(html)
      expect(result).not.toContain('class')
      expect(result).toContain('<p>Hello</p>')
    })

    it('removes style attributes', () => {
      const html = '<p style="color: red; font-size: 16px;">Hello</p>'
      const result = wwwaxe(html)
      expect(result).not.toContain('style')
    })

    it('removes data-* attributes', () => {
      const html = '<div data-testid="foo" data-tracking="bar"><p>Hello</p></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('data-')
    })

    it('removes event handlers', () => {
      const html = '<button onclick="doStuff()" onmouseover="highlight()">Click</button>'
      const result = wwwaxe(html)
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('onmouseover')
      expect(result).toContain('Click')
    })

    it('removes id attributes by default', () => {
      const html = '<div id="main-content"><p>Hello</p></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('id=')
    })

    it('keeps href on links', () => {
      const html = '<a href="/about" class="nav-link text-blue-500">About</a>'
      const result = wwwaxe(html)
      expect(result).toContain('href="/about"')
      expect(result).not.toContain('class')
    })

    it('keeps src and alt on images', () => {
      const html = '<img src="/photo.jpg" alt="A photo" class="rounded-lg" loading="lazy" width="800" height="600">'
      const result = wwwaxe(html)
      expect(result).toContain('src="/photo.jpg"')
      expect(result).toContain('alt="A photo"')
      expect(result).not.toContain('class')
      expect(result).not.toContain('loading')
    })

    it('keeps form-relevant attributes', () => {
      const html = '<input type="email" name="email" placeholder="Enter email" class="input-field" data-validate="true">'
      const result = wwwaxe(html)
      expect(result).toContain('type="email"')
      expect(result).toContain('name="email"')
      expect(result).toContain('placeholder="Enter email"')
      expect(result).not.toContain('class')
      expect(result).not.toContain('data-')
    })

    it('keeps role and aria-label', () => {
      const html = '<div role="navigation" aria-label="Main menu" class="nav-wrapper"><a href="/">Home</a></div>'
      const result = wwwaxe(html)
      expect(result).toContain('role="navigation"')
      expect(result).toContain('aria-label="Main menu"')
    })
  })

  describe('hidden element removal', () => {
    it('removes elements with hidden attribute', () => {
      const html = '<div><p>Visible</p><p hidden>Hidden</p></div>'
      const result = wwwaxe(html)
      expect(result).toContain('Visible')
      expect(result).not.toContain('Hidden')
    })

    it('removes aria-hidden elements by default', () => {
      const html = '<div><p>Visible</p><span aria-hidden="true">Icon</span></div>'
      const result = wwwaxe(html)
      expect(result).not.toContain('Icon')
    })

    it('removes display:none elements', () => {
      const html = '<div><p>Visible</p><p style="display:none">Hidden</p></div>'
      const result = wwwaxe(html)
      expect(result).toContain('Visible')
      expect(result).not.toContain('Hidden')
    })
  })

  describe('structural preservation', () => {
    it('preserves semantic structure', () => {
      const html = `
        <html>
        <body>
          <header><nav><a href="/">Home</a></nav></header>
          <main>
            <article>
              <h1>Title</h1>
              <p>Content</p>
            </article>
          </main>
          <footer><p>Footer</p></footer>
        </body>
        </html>
      `
      const result = wwwaxe(html)
      expect(result).toContain('<header>')
      expect(result).toContain('<nav>')
      expect(result).toContain('<main>')
      expect(result).toContain('<article>')
      expect(result).toContain('<h1>')
      expect(result).toContain('<footer>')
    })

    it('preserves table structure', () => {
      const html = `
        <table class="data-table striped">
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
        </table>
      `
      const result = wwwaxe(html)
      expect(result).toContain('<table>')
      expect(result).toContain('<thead>')
      expect(result).toContain('<th>Name</th>')
      expect(result).toContain('<td>Alice</td>')
      expect(result).not.toContain('class')
    })

    it('preserves list structure', () => {
      const html = '<ul class="menu"><li class="item">One</li><li class="item">Two</li></ul>'
      const result = wwwaxe(html)
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>One</li>')
      expect(result).not.toContain('class')
    })
  })

  describe('presentational tag unwrapping', () => {
    it('unwraps span tags', () => {
      const html = '<p><span class="highlight">Important</span> text</p>'
      const result = wwwaxe(html)
      expect(result).not.toContain('span')
      expect(result).toContain('Important')
      expect(result).toContain('text')
    })

    it('unwraps nested presentational divs', () => {
      const html = '<main><div class="wrapper"><div class="inner"><p>Content</p></div></div></main>'
      const result = wwwaxe(html)
      expect(result).toContain('<main>')
      expect(result).toContain('<p>Content</p>')
      // divs should be unwrapped
      expect(result).not.toContain('<div')
    })
  })

  describe('meta information', () => {
    it('keeps title tag', () => {
      const html = '<html><head><title>My Page</title></head><body><p>Hi</p></body></html>'
      const result = wwwaxe(html)
      expect(result).toContain('<title>My Page</title>')
    })

    it('keeps description meta', () => {
      const html = '<html><head><meta name="description" content="A great page"></head><body><p>Hi</p></body></html>'
      const result = wwwaxe(html)
      expect(result).toContain('description')
      expect(result).toContain('A great page')
    })

    it('keeps og: meta tags', () => {
      const html = '<html><head><meta property="og:title" content="My Title"></head><body><p>Hi</p></body></html>'
      const result = wwwaxe(html)
      expect(result).toContain('og:title')
    })

    it('removes non-useful meta tags', () => {
      const html = '<html><head><meta name="generator" content="WordPress"><meta name="description" content="Good"></head><body><p>Hi</p></body></html>'
      const result = wwwaxe(html)
      expect(result).not.toContain('generator')
      expect(result).toContain('description')
    })
  })

  describe('empty element removal', () => {
    it('removes empty paragraphs', () => {
      const html = '<div><p></p><p>Content</p><p>   </p></div>'
      const result = wwwaxe(html)
      expect(result).toContain('<p>Content</p>')
      // Empty p tags should be removed
      const pCount = (result.match(/<p>/g) || []).length
      expect(pCount).toBe(1)
    })

    it('keeps img even without children', () => {
      const html = '<p><img src="/photo.jpg" alt="Photo"></p>'
      const result = wwwaxe(html)
      expect(result).toContain('<img')
    })
  })

  describe('whitespace handling', () => {
    it('collapses excessive whitespace', () => {
      const html = '<p>Hello     world\n\n\n\nfoo</p>'
      const result = wwwaxe(html)
      expect(result).not.toContain('     ')
      expect(result).toContain('Hello')
      expect(result).toContain('world')
    })
  })

  describe('options', () => {
    it('keepIds preserves id attributes', () => {
      const html = '<div id="main"><p>Hello</p></div>'
      const result = wwwaxe(html, { keepIds: true })
      expect(result).toContain('id="main"')
    })

    it('keepClasses preserves class attributes', () => {
      const html = '<p class="important">Hello</p>'
      const result = wwwaxe(html, { keepClasses: true })
      expect(result).toContain('class="important"')
    })

    it('keepDataAttributes preserves data-* attributes', () => {
      const html = '<div data-section="hero"><p>Hello</p></div>'
      const result = wwwaxe(html, { keepDataAttributes: true })
      expect(result).toContain('data-section="hero"')
    })

    it('keepAriaHidden preserves aria-hidden elements', () => {
      const html = '<div><p>Visible</p><span aria-hidden="true">Icon text</span></div>'
      const result = wwwaxe(html, { keepAriaHidden: true })
      expect(result).toContain('Icon text')
    })
  })

  describe('real-world patterns', () => {
    it('handles a typical blog page', () => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Blog Post</title>
  <meta name="description" content="A great article about coding">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="Next.js">
  <link rel="stylesheet" href="/styles.css">
  <link rel="canonical" href="https://example.com/blog/post">
  <script src="/analytics.js"></script>
  <style>.hero { background: linear-gradient(blue, purple); }</style>
</head>
<body class="dark-theme antialiased" data-page="blog" onclick="trackPageView()">
  <div id="__next">
    <nav id="main-nav" class="sticky top-0 z-50 bg-white shadow-md px-4 py-2 flex items-center justify-between">
      <a href="/" class="logo text-xl font-bold text-gray-900">My Site</a>
      <div class="flex gap-4">
        <a href="/about" class="text-gray-600 hover:text-black transition-colors">About</a>
        <a href="/blog" class="text-gray-600 hover:text-black transition-colors">Blog</a>
        <a href="/contact" class="text-gray-600 hover:text-black transition-colors">Contact</a>
      </div>
    </nav>
    <main class="container mx-auto px-4 py-8 max-w-3xl">
      <article class="prose prose-lg prose-gray">
        <h1 class="text-4xl font-extrabold tracking-tight mb-4">Hello World</h1>
        <p class="text-gray-500 text-sm mb-8">Published on <time datetime="2024-01-15">January 15, 2024</time></p>
        <p class="text-gray-700 leading-relaxed">This is my <a href="/post" class="text-blue-500 underline hover:text-blue-700">blog post</a> about interesting things.</p>
        <img src="/photo.jpg" alt="A beautiful photo" class="rounded-lg shadow-xl my-8" loading="lazy" width="800" height="600" decoding="async">
        <h2 class="text-2xl font-bold mt-8 mb-4">Section Two</h2>
        <p class="text-gray-700 leading-relaxed">More content here with <strong>bold text</strong> and a list:</p>
        <ul class="list-disc pl-6 space-y-2">
          <li class="text-gray-700">First item</li>
          <li class="text-gray-700">Second item</li>
          <li class="text-gray-700">Third item</li>
        </ul>
      </article>
    </main>
    <footer class="bg-gray-100 py-8 mt-16">
      <div class="container mx-auto px-4 text-center text-gray-500 text-sm">
        <p>&copy; 2024 My Site. All rights reserved.</p>
      </div>
    </footer>
  </div>
  <script>
    window.__NEXT_DATA__ = {"props":{"pageProps":{}}};
    (function() { /* analytics */ })();
  </script>
  <noscript><img src="/pixel.gif" alt=""></noscript>
</body>
</html>`

      const result = wwwaxe(html)

      // Should keep structure
      expect(result).toContain('<nav>')
      expect(result).toContain('<main>')
      expect(result).toContain('<article>')
      expect(result).toContain('<footer>')

      // Should keep content
      expect(result).toContain('Hello World')
      expect(result).toContain('blog post')
      expect(result).toContain('Section Two')
      expect(result).toContain('First item')

      // Should keep links
      expect(result).toContain('href="/about"')
      expect(result).toContain('href="/post"')

      // Should keep images
      expect(result).toContain('src="/photo.jpg"')
      expect(result).toContain('alt="A beautiful photo"')

      // Should keep meta
      expect(result).toContain('<title>My Blog Post</title>')
      expect(result).toContain('A great article about coding')

      // Should strip
      expect(result).not.toContain('<script')
      expect(result).not.toContain('style=')
      expect(result).not.toContain('class=')
      expect(result).not.toContain('analytics')
      expect(result).not.toContain('__NEXT_DATA__')
      expect(result).not.toContain('noscript')
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('data-page')
      expect(result).not.toContain('generator')

      // Should be significantly smaller
      expect(result.length).toBeLessThan(html.length * 0.5)

      console.log('Input size:', html.length, 'bytes')
      console.log('Output size:', result.length, 'bytes')
      console.log('Reduction:', Math.round((1 - result.length / html.length) * 100) + '%')
    })
  })
})
