// Types for seo-routes.mjs so the Vitest suite typechecks.
export interface SeoRoute {
  path: string
  title: string
  description: string
  h1: string
  lead: string
}

export interface SeoAuthor {
  '@type': 'Person'
  '@id': string
  name: string
  url: string
}

export const SITE_ORIGIN: string
export const SITE_NAME: string
export const AUTHOR: SeoAuthor
export const REPO_URL: string
export const RESEARCH_URL: string
export const WRITEUP_URL: string
export const PUBLIC_ROUTES: SeoRoute[]
export const APP_ROUTES: string[]
export const APP_SHELL_PATH: string
export function toDescription(lead: string): string
