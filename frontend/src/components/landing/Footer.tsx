import { Github } from 'lucide-react'

const LINKS = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Docs', href: '/docs' },
  ],
  resources: [
    { label: 'GitHub', href: 'https://github.com/OpenCodeIntel/opencodeintel', external: true },
    { label: 'MCP Setup', href: '/docs/mcp-setup' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                OCI
              </div>
              <span className="font-semibold text-foreground">OpenCodeIntel</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Semantic code search that actually understands your codebase.
            </p>
            <a
              href="https://github.com/OpenCodeIntel/opencodeintel"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
              <span className="text-sm">Star on GitHub</span>
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {LINKS.product.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {LINKS.resources.map((link) => (
                <li key={link.href}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground/60">
            © {new Date().getFullYear()} OpenCodeIntel. Open source under MIT.
          </p>
          <p className="text-sm text-muted-foreground/60">
            Built with ❤️ by <a href="https://devanshu.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Devanshu</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
