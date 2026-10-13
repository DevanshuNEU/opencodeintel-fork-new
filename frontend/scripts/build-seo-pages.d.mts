// Types for build-seo-pages.mjs so the Vitest suite typechecks.
import type { SeoRoute } from './seo-routes.mjs'

export function escapeHtml(value: string): string
export function canonicalUrl(routePath: string): string
export function outputFileFor(routePath: string): string
export function validateRoutes(routes: SeoRoute[]): void
export function replaceOnce(html: string, pattern: RegExp, replacement: string, label: string): string
export function buildJsonLd(route: SeoRoute, template: string): Record<string, unknown>
export function renderStaticBlock(route: SeoRoute, routes?: SeoRoute[]): string
export function renderRoutePage(template: string, route: SeoRoute, routes?: SeoRoute[]): string
export function renderAppShell(template: string, home?: SeoRoute): string
export function renderSitemap(routes?: SeoRoute[]): string
export function renderLlmsTxt(routes?: SeoRoute[]): string
export function render404(): string
export function verifyPage(html: string, route: SeoRoute): void
export function renderAll(template: string, routes?: SeoRoute[]): Map<string, string>
export function buildSeoPages(distDir: string, routes?: SeoRoute[]): string[]
