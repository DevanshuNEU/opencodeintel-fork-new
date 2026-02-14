import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RelatedDoc {
  title: string
  description: string
  href: string
  icon?: React.ReactNode
}

interface DocsRelatedProps {
  items: RelatedDoc[]
  title?: string
}

export function DocsRelated({ items, title = 'Related Documentation' }: DocsRelatedProps) {
  if (items.length === 0) return null

  return (
    <div className="my-12 pt-8 border-t border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="group flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
          >
            {item.icon && (
              <span className="mt-0.5 text-gray-400 group-hover:text-blue-400 transition-colors">
                {item.icon}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors flex items-center gap-1">
                {item.title}
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h4>
              <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

interface DocsNavLink {
  title: string
  href: string
}

interface DocsPaginationProps {
  prev?: DocsNavLink
  next?: DocsNavLink
}

export function DocsPagination({ prev, next }: DocsPaginationProps) {
  return (
    <div className="my-12 pt-8 border-t border-white/10 flex items-center justify-between gap-4">
      {prev ? (
        <Link
          to={prev.href}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Previous</span>
            <span className="font-medium">{prev.title}</span>
          </div>
        </Link>
      ) : (
        <div />
      )}
      
      {next ? (
        <Link
          to={next.href}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-right"
        >
          <div>
            <span className="text-xs text-gray-500 block">Next</span>
            <span className="font-medium">{next.title}</span>
          </div>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}

interface DocsCardProps {
  title: string
  description: string
  href: string
  icon?: React.ReactNode
  badge?: string
}

export function DocsCard({ title, description, href, icon, badge }: DocsCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group relative flex flex-col p-5 rounded-xl',
        'bg-[#111113] border border-white/10',
        'hover:border-blue-500/50 hover:bg-blue-500/5 transition-all'
      )}
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-full bg-blue-500/20 text-blue-400">
          {badge}
        </span>
      )}
      
      <div className="flex items-start gap-4">
        {icon && (
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-colors">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-white mb-1 group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-gray-400 text-sm line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function DocsCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 my-6">
      {children}
    </div>
  )
}
