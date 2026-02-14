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

export function DocsRelated({ items, title = 'Related' }: DocsRelatedProps) {
  return (
    <div className="my-8">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'group flex items-start gap-3 p-4',
              'bg-white/5 border border-white/10 rounded-lg',
              'hover:bg-white/[0.07] hover:border-blue-500/30 transition-all'
            )}
          >
            {item.icon && (
              <span className="shrink-0 text-gray-400 group-hover:text-blue-400 transition-colors">
                {item.icon}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white group-hover:text-blue-400 transition-colors">
                {item.title}
              </p>
              <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">
                {item.description}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// Previous/Next navigation at bottom of page
interface DocsPaginationProps {
  prev?: {
    title: string
    href: string
  }
  next?: {
    title: string
    href: string
  }
}

export function DocsPagination({ prev, next }: DocsPaginationProps) {
  return (
    <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/10">
      {prev ? (
        <Link
          to={prev.href}
          className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <div>
            <p className="text-xs text-gray-500">Previous</p>
            <p className="font-medium">{prev.title}</p>
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
            <p className="text-xs text-gray-500">Next</p>
            <p className="font-medium">{next.title}</p>
          </div>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
