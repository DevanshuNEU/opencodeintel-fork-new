import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface TOCItem {
  id: string
  title: string
  level: number
}

interface DocsTableOfContentsProps {
  items: TOCItem[]
}

export function DocsTableOfContents({ items }: DocsTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0,
      }
    )

    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) {
    return null
  }

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        On this page
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                const element = document.getElementById(item.id)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                  setActiveId(item.id)
                  // Update URL without triggering navigation
                  window.history.replaceState(null, '', `#${item.id}`)
                }
              }}
              className={cn(
                'block text-sm py-1 transition-colors border-l-2 -ml-px',
                item.level === 2 && 'pl-3',
                item.level === 3 && 'pl-6',
                item.level === 4 && 'pl-9',
                activeId === item.id
                  ? 'text-blue-400 border-blue-400 font-medium'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
              )}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// Hook to extract TOC items from page content
export function useTableOfContents(): TOCItem[] {
  const [items, setItems] = useState<TOCItem[]>([])

  useEffect(() => {
    // Find all headings with IDs in the main content
    const headings = document.querySelectorAll('article h2[id], article h3[id], article h4[id]')
    
    const tocItems: TOCItem[] = Array.from(headings).map((heading) => ({
      id: heading.id,
      title: heading.textContent || '',
      level: parseInt(heading.tagName.charAt(1)),
    }))

    setItems(tocItems)
  }, [])

  return items
}
