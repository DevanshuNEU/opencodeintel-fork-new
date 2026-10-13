// Runs after `vite build`. Turns dist/index.html into one static page per
// public route (own title, canonical, JSON-LD and a readable block inside
// #root), plus the app shell, sitemap.xml, llms.txt and 404.html.
// Plain Node on purpose: Vercel builds with npm, CI with Bun. Every step
// throws on a missing anchor or empty field so a bad build never ships.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AUTHOR,
  PUBLIC_ROUTES,
  REPO_URL,
  RESEARCH_URL,
  SITE_NAME,
  SITE_ORIGIN,
  WRITEUP_URL,
} from './seo-routes.mjs'

const ROUTE_FIELDS = ['path', 'title', 'description', 'h1', 'lead']
const STATIC_OPEN = '<!--static-route-->'
const STATIC_CLOSE = '<!--/static-route-->'

const ANCHORS = {
  title: /<title>[^<]*<\/title>/g,
  canonical: /<link rel="canonical" href="[^"]*"\s*\/?>/g,
  jsonLd: /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
  // matches the empty source root and an already-generated one, so reruns work
  root: /<div id="root">(?:<!--static-route-->[\s\S]*?<!--\/static-route-->)?<\/div>/g,
}

const metaName = (name) => new RegExp(`<meta name="${name}" content="[^"]*"\\s*/?>`, 'g')
const metaProp = (prop) => new RegExp(`<meta property="${prop}" content="[^"]*"\\s*/?>`, 'g')

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function canonicalUrl(routePath) {
  return routePath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${routePath}`
}

export function outputFileFor(routePath) {
  return routePath === '/' ? 'index.html' : `${routePath.slice(1)}.html`
}

const navLabel = (route) => (route.path === '/' ? 'Home' : route.h1)

export function validateRoutes(routes) {
  const seen = new Set()
  for (const route of routes) {
    for (const field of ROUTE_FIELDS) {
      if (typeof route[field] !== 'string' || route[field].trim() === '') {
        throw new Error(`seo: route ${route.path ?? '(no path)'} has an empty "${field}"`)
      }
    }
    if (!route.path.startsWith('/') || (route.path !== '/' && route.path.endsWith('/'))) {
      throw new Error(`seo: route path "${route.path}" must start with / and have no trailing slash`)
    }
    if (route.description.length > 160) throw new Error(`seo: description too long on ${route.path}`)
    if (seen.has(route.path)) throw new Error(`seo: duplicate route ${route.path}`)
    seen.add(route.path)
  }
}

// String.replace with a function so "$" in copy is never treated as a pattern
export function replaceOnce(html, pattern, replacement, label) {
  const count = (html.match(pattern) ?? []).length
  if (count !== 1) throw new Error(`seo: expected exactly one ${label} anchor, found ${count}`)
  return html.replace(pattern, () => replacement)
}

function jsonLdScript(data) {
  const body = JSON.stringify(data, null, 2).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">\n${body}\n    </script>`
}

function readTemplateJsonLd(template) {
  const match = template.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  if (!match) throw new Error('seo: template has no JSON-LD block')
  return JSON.parse(match[1])
}

export function buildJsonLd(route, template) {
  const url = canonicalUrl(route.path)
  if (route.path === '/') {
    const app = readTemplateJsonLd(template)
    if (app['@type'] !== 'SoftwareApplication') {
      throw new Error(`seo: home JSON-LD must be SoftwareApplication, got ${app['@type']}`)
    }
    return { ...app, url, author: AUTHOR }
  }
  const crumbs = [
    { name: 'Home', item: canonicalUrl('/') },
    { name: 'Docs', item: canonicalUrl('/docs') },
  ]
  if (route.path !== '/docs') crumbs.push({ name: route.h1, item: url })
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': route.path === '/docs' ? 'WebPage' : 'TechArticle',
        '@id': `${url}#page`,
        headline: route.h1,
        name: route.title,
        description: route.description,
        url,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: SITE_NAME, url: canonicalUrl('/') },
        author: AUTHOR,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
      },
    ],
  }
}

export function renderStaticBlock(route, routes = PUBLIC_ROUTES) {
  const links = routes
    .map((r) => `<li><a href="${escapeHtml(r.path)}">${escapeHtml(navLabel(r))}</a></li>`)
    .join('')
  return [
    STATIC_OPEN,
    '<main data-static-route style="min-height:100vh;max-width:760px;margin:0 auto;padding:48px 24px;background:#0a0a0f;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;line-height:1.6">',
    '<style>[data-static-route] a{color:#a1a1aa}</style>',
    `<h1>${escapeHtml(route.h1)}</h1>`,
    `<p>${escapeHtml(route.lead)}</p>`,
    `<nav aria-label="Pages"><ul>${links}</ul></nav>`,
    `<p>Built by <a href="${AUTHOR.url}">${AUTHOR.name}</a>. Source on <a href="${REPO_URL}">GitHub</a>. Retrieval research: <a href="${RESEARCH_URL}">OpenCodeIntel/retrieval-research</a>.</p>`,
    '</main>',
    STATIC_CLOSE,
  ].join('')
}

function applyHead(template, route) {
  const url = canonicalUrl(route.path)
  const image = `${SITE_ORIGIN}/og-image.png`
  const title = escapeHtml(route.title)
  const description = escapeHtml(route.description)
  const swaps = [
    [ANCHORS.title, `<title>${title}</title>`, 'title'],
    [metaName('title'), `<meta name="title" content="${title}" />`, 'meta title'],
    [metaName('description'), `<meta name="description" content="${description}" />`, 'meta description'],
    [metaName('author'), `<meta name="author" content="${escapeHtml(AUTHOR.name)}" />`, 'meta author'],
    [ANCHORS.canonical, `<link rel="canonical" href="${url}" />`, 'canonical'],
    [metaProp('og:url'), `<meta property="og:url" content="${url}" />`, 'og:url'],
    [metaProp('og:title'), `<meta property="og:title" content="${title}" />`, 'og:title'],
    [metaProp('og:description'), `<meta property="og:description" content="${description}" />`, 'og:description'],
    [metaProp('og:image'), `<meta property="og:image" content="${image}" />`, 'og:image'],
    [metaName('twitter:url'), `<meta name="twitter:url" content="${url}" />`, 'twitter:url'],
    [metaName('twitter:title'), `<meta name="twitter:title" content="${title}" />`, 'twitter:title'],
    [metaName('twitter:description'), `<meta name="twitter:description" content="${description}" />`, 'twitter:description'],
    [metaName('twitter:image'), `<meta name="twitter:image" content="${image}" />`, 'twitter:image'],
    [ANCHORS.jsonLd, jsonLdScript(buildJsonLd(route, template)), 'JSON-LD'],
  ]
  return swaps.reduce((html, [pattern, value, label]) => replaceOnce(html, pattern, value, label), template)
}

export function renderRoutePage(template, route, routes = PUBLIC_ROUTES) {
  validateRoutes([route])
  const html = applyHead(template, route)
  return replaceOnce(html, ANCHORS.root, `<div id="root">${renderStaticBlock(route, routes)}</div>`, 'root')
}

// App routes get the bare SPA: no static block, no canonical, noindex.
export function renderAppShell(template, home = PUBLIC_ROUTES[0]) {
  let html = applyHead(template, home)
  html = replaceOnce(html, ANCHORS.canonical, '', 'canonical')
  html = replaceOnce(html, metaName('robots'), '<meta name="robots" content="noindex" />', 'meta robots')
  html = replaceOnce(html, metaName('googlebot'), '<meta name="googlebot" content="noindex" />', 'meta googlebot')
  return replaceOnce(html, ANCHORS.root, '<div id="root"></div>', 'root')
}

export function renderSitemap(routes = PUBLIC_ROUTES) {
  const urls = routes.map((r) => `  <url>\n    <loc>${escapeHtml(canonicalUrl(r.path))}</loc>\n  </url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function renderLlmsTxt(routes = PUBLIC_ROUTES) {
  const pages = routes.map((r) => `- [${navLabel(r)}](${canonicalUrl(r.path)}): ${r.description}`)
  return [
    `# ${SITE_NAME}`,
    '',
    '> Open source code intelligence: semantic code search, dependency analysis and impact prediction for GitHub repositories, through a web app, a REST API and an MCP server for AI assistants.',
    '',
    '## Pages',
    '',
    ...pages,
    '',
    '## Links',
    '',
    `- [GitHub repository](${REPO_URL}): source code, MIT licensed`,
    `- [Retrieval research](${RESEARCH_URL}): query sets, raw results and the experiment log behind the retrieval design`,
    `- [Why I built OpenCodeIntel](${WRITEUP_URL}): the write-up`,
    '',
    `Built by ${AUTHOR.name} (${AUTHOR.url})`,
    '',
  ].join('\n')
}

export function render404() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <title>Page not found | ${SITE_NAME}</title>
  </head>
  <body style="margin:0;background:#0a0a0f;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif">
    <main style="max-width:760px;margin:0 auto;padding:96px 24px;line-height:1.6">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <p><a href="/" style="color:#a1a1aa">Home</a> or <a href="/docs" style="color:#a1a1aa">Docs</a></p>
    </main>
  </body>
</html>
`
}

export function verifyPage(html, route) {
  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1])
  const expected = canonicalUrl(route.path)
  if (canonicals.length !== 1 || canonicals[0] !== expected) {
    throw new Error(`seo: ${route.path} canonical check failed: [${canonicals.join(', ')}], want ${expected}`)
  }
  const rootStart = html.indexOf('<div id="root">')
  if (rootStart === -1 || !html.slice(rootStart).includes(`<h1>${escapeHtml(route.h1)}</h1>`)) {
    throw new Error(`seo: ${route.path} is missing its h1 inside #root`)
  }
  readTemplateJsonLd(html)
}

export function renderAll(template, routes = PUBLIC_ROUTES) {
  validateRoutes(routes)
  const files = new Map()
  for (const route of routes) files.set(outputFileFor(route.path), renderRoutePage(template, route, routes))
  files.set('app-shell.html', renderAppShell(template, routes[0]))
  files.set('sitemap.xml', renderSitemap(routes))
  files.set('llms.txt', renderLlmsTxt(routes))
  files.set('404.html', render404())
  return files
}

export function buildSeoPages(distDir, routes = PUBLIC_ROUTES) {
  const templatePath = path.join(distDir, 'index.html')
  if (!fs.existsSync(templatePath)) throw new Error(`seo: ${templatePath} not found, run vite build first`)
  const template = fs.readFileSync(templatePath, 'utf8')
  if (template.includes('/src/main.tsx')) throw new Error('seo: dist/index.html is the dev template, run vite build first')

  // render everything before writing anything, so a throw leaves dist untouched
  const files = renderAll(template, routes)
  for (const [file, content] of files) {
    const target = path.join(distDir, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }

  for (const route of routes) verifyPage(fs.readFileSync(path.join(distDir, outputFileFor(route.path)), 'utf8'), route)
  const shell = fs.readFileSync(path.join(distDir, 'app-shell.html'), 'utf8')
  if (shell.includes('rel="canonical"') || !shell.includes('content="noindex"') || shell.includes(STATIC_OPEN)) {
    throw new Error('seo: app-shell.html must have no canonical, no static block and a noindex robots meta')
  }
  return [...files.keys()]
}

function main() {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const written = buildSeoPages(distDir)
  console.log(`seo: wrote ${written.length} files to ${distDir}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
