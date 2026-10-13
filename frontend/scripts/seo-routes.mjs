// Single source of truth for public routes. Feeds the static route pages,
// sitemap.xml and llms.txt. h1 and lead are copied verbatim from each page
// component; src/test/seoPages.test.ts fails if they drift.

export const SITE_ORIGIN = 'https://www.opencodeintel.com'
export const SITE_NAME = 'OpenCodeIntel'

export const AUTHOR = {
  '@type': 'Person',
  '@id': 'https://www.devanshuchicholikar.com/#devanshu',
  name: 'Devanshu Chicholikar',
  url: 'https://www.devanshuchicholikar.com',
}

export const REPO_URL = 'https://github.com/OpenCodeIntel/opencodeintel'
export const RESEARCH_URL = 'https://github.com/OpenCodeIntel/retrieval-research'
export const WRITEUP_URL = 'https://www.devanshuchicholikar.com/writing/why-i-built-opencodeintel'

const MAX_DESCRIPTION = 160

// trims on a word boundary so search snippets never cut a word in half
export function toDescription(lead) {
  const text = lead.replace(/\s+/g, ' ').trim()
  if (text.length <= MAX_DESCRIPTION) return text
  const cut = text.slice(0, MAX_DESCRIPTION - 3)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).replace(/[\s,.;:]+$/, '')}...`
}

function docsPage(path, h1, lead) {
  return { path, title: `${h1} | ${SITE_NAME}`, description: toDescription(lead), h1, lead }
}

const HOME_LEAD = 'Import any GitHub repo in one click. Search code with plain English. Find anything, instantly.'

export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'OpenCodeIntel | Understand Any Codebase',
    description: toDescription(HOME_LEAD),
    h1: 'Stop feeling lost in unfamiliar codebases.',
    lead: HOME_LEAD,
  },
  docsPage(
    '/docs',
    'OpenCodeIntel Docs',
    'Give your AI assistant deep understanding of your codebase. Semantic search, dependency analysis, and impact prediction. Set up in 5 minutes.',
  ),
  docsPage(
    '/docs/quickstart',
    'Quick Start',
    'Get OpenCodeIntel running and search your first codebase in under 5 minutes.',
  ),
  docsPage(
    '/docs/mcp-setup',
    'MCP Setup Guide',
    'Connect OpenCodeIntel to Claude Desktop in under 5 minutes. Give your AI assistant persistent memory of your entire codebase.',
  ),
  docsPage(
    '/docs/mcp-tools',
    'MCP Tools Reference',
    'Complete reference for all MCP tools available to Claude and other AI assistants.',
  ),
  docsPage(
    '/docs/mcp-examples',
    'Example Prompts',
    'Real-world prompts for using OpenCodeIntel with Claude. Copy, paste, adapt.',
  ),
  docsPage(
    '/docs/features/search',
    'Semantic Search',
    'Find code by meaning, not keywords. Search for "error handling" and find processFailure().',
  ),
  docsPage(
    '/docs/features/dependencies',
    'Dependency Analysis',
    'Visualize your architecture. See what connects to what and identify the critical files.',
  ),
  docsPage(
    '/docs/features/impact',
    'Impact Prediction',
    'Know what breaks before you change it. See the blast radius of any modification.',
  ),
  docsPage(
    '/docs/features/style',
    'Code Style Analysis',
    'Understand team conventions. Write code that fits in with existing patterns.',
  ),
  docsPage(
    '/docs/deployment/docker',
    'Docker Setup',
    'Run the entire OpenCodeIntel stack locally with Docker Compose.',
  ),
  docsPage(
    '/docs/deployment/self-host',
    'Self-Hosting',
    'Deploy OpenCodeIntel on your own infrastructure for full control and data privacy.',
  ),
  docsPage(
    '/docs/api',
    'API Reference',
    'REST API for programmatic access to OpenCodeIntel features.',
  ),
  docsPage(
    '/docs/api/repositories',
    'Repositories API',
    'Manage repositories: list, add, delete, and reindex.',
  ),
  docsPage(
    '/docs/api/search',
    'Search API',
    'Semantic code search across indexed repositories.',
  ),
  docsPage(
    '/docs/api/analysis',
    'Analysis API',
    'Dependency graphs, impact analysis, code style, and repository insights.',
  ),
  docsPage(
    '/docs/architecture',
    'Architecture',
    'How OpenCodeIntel is built. Technical deep-dive for contributors.',
  ),
  docsPage(
    '/docs/contributing',
    'Contributing',
    'How to set up your development environment and contribute to OpenCodeIntel.',
  ),
]

// Client-only routes. Vercel rewrites these to /app-shell (noindex) and
// sends X-Robots-Tag: noindex. Sources use Vercel path syntax and must match
// the rewrites in vercel.json exactly.
export const APP_ROUTES = [
  '/login',
  '/signup',
  '/dashboard',
  '/dashboard/:path*',
  '/admin',
  '/github/callback',
]

export const APP_SHELL_PATH = '/app-shell'
