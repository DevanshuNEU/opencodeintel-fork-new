import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

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
