import { describe, it, expect } from 'vitest'
import appSource from '@/App.tsx?raw'
import heroSource from '@/components/landing/Hero.tsx?raw'
import footerSource from '@/components/landing/Footer.tsx?raw'
import thisTestSource from './seoPages.test.ts?raw'
import indexHtml from '../../index.html?raw'
import vercelRaw from '../../vercel.json?raw'
import robotsTxt from '../../public/robots.txt?raw'
import routesSource from '../../scripts/seo-routes.mjs?raw'
import routesTypes from '../../scripts/seo-routes.d.mts?raw'
import generatorSource from '../../scripts/build-seo-pages.mjs?raw'
import generatorTypes from '../../scripts/build-seo-pages.d.mts?raw'
import { APP_ROUTES, AUTHOR, PUBLIC_ROUTES, SITE_ORIGIN } from '../../scripts/seo-routes.mjs'
import {
  renderAll,
  renderAppShell,
  renderLlmsTxt,
  renderRoutePage,
  renderSitemap,
  verifyPage,
} from '../../scripts/build-seo-pages.mjs'

const pageSources = import.meta.glob<string>('../pages/**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()
const stripTags = (text: string) => normalize(text.replace(/<[^>]*>/g, ' ')).replace(/ ([.,])/g, '$1')

// <Route path="/x" element={<Comp />} /> pairs, tolerant of multi-line JSX
const appRoutes = [...appSource.matchAll(/<Route\s+path="([^"]+)"(?:\s+element=\{<(\w+)\s*\/>\})?/g)].map(
  (m) => ({ path: m[1], component: m[2] }),
)

function componentFile(name: string): string {
  const hit = Object.entries(pageSources).find(([, src]) =>
    new RegExp(`export (function|const) ${name}\\b`).test(src),
  )
  if (!hit) throw new Error(`no page file exports ${name}`)
  return hit[1]
}

const docsRoute = PUBLIC_ROUTES.find((r) => r.path === '/docs/mcp-setup')!
const vercel = JSON.parse(vercelRaw) as {
  cleanUrls?: boolean
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

describe('route registry parity with App.tsx', () => {
  it('covers every App.tsx route with a public page or an app rewrite', () => {
    const publicPaths = new Set(PUBLIC_ROUTES.map((r) => r.path))
    expect(appRoutes.length).toBeGreaterThan(20)
    for (const { path } of appRoutes) {
      if (path === '*') continue
      if (path.endsWith('/*')) {
        const base = path.slice(0, -2)
        expect(APP_ROUTES, path).toContain(base)
        expect(APP_ROUTES, path).toContain(`${base}/:path*`)
      } else {
        expect(publicPaths.has(path) || APP_ROUTES.includes(path), path).toBe(true)
      }
    }
  })

  it('has every public path declared in App.tsx', () => {
    const declared = new Set(appRoutes.map((r) => r.path))
    expect(PUBLIC_ROUTES).toHaveLength(18)
    for (const route of PUBLIC_ROUTES) expect(declared.has(route.path), route.path).toBe(true)
  })
})

describe('static copy matches the rendered page', () => {
  it.each(PUBLIC_ROUTES.filter((r) => r.path !== '/'))('$path h1 and lead come from its component', (route) => {
    const component = appRoutes.find((r) => r.path === route.path)?.component
    expect(component, route.path).toBeTruthy()
    const src = componentFile(component!)
    const h1 = src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
    expect(h1, route.path).not.toBeNull()
    expect(normalize(h1![1])).toBe(route.h1)
    expect(stripTags(src)).toContain(route.lead)
  })

  it('home h1 words and lead come from Hero.tsx', () => {
    const home = PUBLIC_ROUTES[0]
    expect(home.path).toBe('/')
    for (const word of home.h1.split(' ')) expect(heroSource).toContain(`'${word}'`)
    expect(stripTags(heroSource)).toContain(home.lead)
  })
})

describe('generator output', () => {
  const html = renderRoutePage(indexHtml, docsRoute)

  it('writes the route title and a www canonical', () => {
    expect(html).toContain('<title>MCP Setup Guide | OpenCodeIntel</title>')
    expect(html).toContain('<link rel="canonical" href="https://www.opencodeintel.com/docs/mcp-setup" />')
    expect(html).toContain('<meta property="og:image" content="https://www.opencodeintel.com/og-image.png" />')
    expect(html).toContain('<meta name="author" content="Devanshu Chicholikar" />')
    expect(html).not.toContain('https://opencodeintel.com')
    expect(() => verifyPage(html, docsRoute)).not.toThrow()
  })

  it('emits JSON-LD with the portfolio Person and a BreadcrumbList', () => {
    const raw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]
    const data = JSON.parse(raw)
    const page = data['@graph'].find((n: { '@type': string }) => n['@type'] === 'TechArticle')
    const crumbs = data['@graph'].find((n: { '@type': string }) => n['@type'] === 'BreadcrumbList')
    expect(page.author['@id']).toBe(AUTHOR['@id'])
    expect(page.url).toBe(`${SITE_ORIGIN}/docs/mcp-setup`)
    expect(crumbs.itemListElement.map((c: { name: string }) => c.name)).toEqual(['Home', 'Docs', 'MCP Setup Guide'])
  })

  it('puts the h1 and the author inside #root', () => {
    const root = html.slice(html.indexOf('<div id="root">'))
    expect(root).toContain('<h1>MCP Setup Guide</h1>')
    expect(root).toContain('Devanshu Chicholikar')
    expect(root).toContain('href="/docs/quickstart"')
  })

  it('keeps the home JSON-LD a SoftwareApplication with the Person author', () => {
    const home = renderRoutePage(indexHtml, PUBLIC_ROUTES[0])
    const data = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])
    expect(data['@type']).toBe('SoftwareApplication')
    expect(data.url).toBe(`${SITE_ORIGIN}/`)
    expect(data.offers).toBeTruthy()
    expect(data.author).toEqual(AUTHOR)
  })

  it('is idempotent when fed its own output', () => {
    const once = renderRoutePage(indexHtml, PUBLIC_ROUTES[0])
    expect(renderRoutePage(once, docsRoute)).toBe(html)
    expect(renderAppShell(once)).toBe(renderAppShell(indexHtml))
  })

  it('builds an app shell with no canonical, no static block and noindex', () => {
    const shell = renderAppShell(indexHtml)
    expect(shell).not.toContain('rel="canonical"')
    expect(shell).toContain('<meta name="robots" content="noindex" />')
    expect(shell).toContain('<div id="root"></div>')
  })

  it('fails closed on an empty field or a missing anchor', () => {
    expect(() => renderRoutePage(indexHtml, { ...docsRoute, lead: ' ' })).toThrow(/empty "lead"/)
    expect(() => renderRoutePage(indexHtml.replace(/<link rel="canonical"[^>]*>/, ''), docsRoute)).toThrow(/canonical/)
  })

  it('lists exactly the 18 public routes on www in the sitemap', () => {
    const locs = [...renderSitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toHaveLength(18)
    for (const loc of locs) expect(loc.startsWith(`${SITE_ORIGIN}/`)).toBe(true)
    for (const app of ['/login', '/signup', '/dashboard', '/admin', '/github/callback']) {
      expect(locs).not.toContain(`${SITE_ORIGIN}${app}`)
    }
  })

  it('names the author in llms.txt', () => {
    const llms = renderLlmsTxt()
    expect(llms.startsWith('# OpenCodeIntel\n')).toBe(true)
    expect(llms).toContain('Built by Devanshu Chicholikar (https://www.devanshuchicholikar.com)')
    expect(llms).toContain(`(${SITE_ORIGIN}/docs/mcp-setup)`)
  })
})

describe('vercel.json routing', () => {
  it('uses clean URLs and has no catch-all rewrite', () => {
    expect(vercel.cleanUrls).toBe(true)
    expect(vercel.rewrites.some((r) => r.source === '/(.*)')).toBe(false)
  })

  it('rewrites every app route to the app shell', () => {
    expect(vercel.rewrites.map((r) => r.source).sort()).toEqual([...APP_ROUTES].sort())
    for (const r of vercel.rewrites) expect(r.destination).toBe('/app-shell')
  })

  it('sends X-Robots-Tag noindex on app routes and the shell', () => {
    for (const source of [...APP_ROUTES, '/app-shell']) {
      const entry = vercel.headers.find((h) => h.source === source)
      expect(entry, source).toBeTruthy()
      expect(entry!.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex' })
    }
  })
})

describe('copy hygiene', () => {
  it('credits Devanshu in the footer with no emoji', () => {
    expect(footerSource).toContain('href="https://www.devanshuchicholikar.com"')
    expect(footerSource).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}/u)
  })

  it('has no em or en dash in any file this change touches or generates', () => {
    const generated = [...renderAll(indexHtml).values()]
    const files = [
      thisTestSource, indexHtml, vercelRaw, robotsTxt, footerSource,
      routesSource, routesTypes, generatorSource, generatorTypes, ...generated,
    ]
    // built from char codes so this file never contains the characters it bans
    const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
    for (const text of files) expect(text).not.toMatch(dashes)
  })
})

// Gaps closed after the pre-PR review (arch + qa minors).
describe('review follow-ups', () => {
  it('counts every <Route> in App.tsx, so a route written in another style cannot slip past parity', () => {
    const allRouteTags = appSource.match(/<Route\b/g) ?? []
    expect(appRoutes.length).toBe(allRouteTags.length)
  })

  it('gives every public page a unique title and description', () => {
    const titles = PUBLIC_ROUTES.map((r) => r.title)
    const descriptions = PUBLIC_ROUTES.map((r) => r.description)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
  })

  it('keeps the home h1 in the same word order as the hero', () => {
    const words = [...heroSource.matchAll(/line[12]Words = \[([^\]]+)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((w) => w[1]))
    expect(words.join(' ')).toBe(PUBLIC_ROUTES[0].h1)
  })

  it('robots.txt points at the www sitemap and disallows every app route', () => {
    expect(robotsTxt).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
    for (const route of APP_ROUTES.filter((r) => !r.includes(':'))) {
      expect(robotsTxt, route).toMatch(new RegExp(`^Disallow: ${route}$`, 'm'))
    }
  })

  it('credits Devanshu Chicholikar in the footer text, not just the link', () => {
    expect(footerSource).toContain('Built by <a href="https://www.devanshuchicholikar.com"')
    expect(footerSource).toMatch(/>Devanshu Chicholikar<\/a>/)
  })

  it('renders exactly the expected set of output files', () => {
    const files = renderAll(indexHtml)
    const expected = [
      ...PUBLIC_ROUTES.map((r) => (r.path === '/' ? 'index.html' : `${r.path.slice(1)}.html`)),
      'app-shell.html',
      'sitemap.xml',
      'llms.txt',
      '404.html',
    ].sort()
    expect([...files.keys()].sort()).toEqual(expected)
  })
})
