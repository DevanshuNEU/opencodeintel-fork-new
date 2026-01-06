import { useScrollReveal } from '@/hooks/useScrollReveal'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

export function AnimatedSection({ children, className }: Props) {
  const { ref, visible } = useScrollReveal()

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
    >
      {children}
    </div>
  )
}
