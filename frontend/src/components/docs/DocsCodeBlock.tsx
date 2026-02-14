import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface CodeBlockProps {
  children: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
}

export function DocsCodeBlock({ 
  children, 
  language = 'bash',
  filename,
  showLineNumbers = false,
  highlightLines = []
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(children.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1c]">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="text-xs text-gray-400 font-mono">{filename}</span>
          <span className="text-xs text-gray-500 uppercase">{language}</span>
        </div>
      )}
      
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          wrapLines={highlightLines.length > 0}
          lineProps={(lineNumber) => ({
            style: {
              backgroundColor: highlightLines.includes(lineNumber) 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'transparent',
              display: 'block',
              width: '100%',
            },
          })}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
        >
          {children.trim()}
        </SyntaxHighlighter>
        
        <button
          onClick={copyToClipboard}
          className={cn(
            'absolute top-2 right-2 p-2 rounded-md transition-all',
            'bg-white/5 opacity-0 group-hover:opacity-100',
            'hover:bg-white/10 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  )
}

// Multi-language code block with tabs
interface CodeTabsProps {
  tabs: {
    label: string
    language: string
    code: string
  }[]
  filename?: string
}

export function DocsCodeTabs({ tabs, filename }: CodeTabsProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState(tabs[0]?.label || '')

  const copyToClipboard = async () => {
    const activeCode = tabs.find(t => t.label === activeTab)?.code || ''
    await navigator.clipboard.writeText(activeCode.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1c]">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <TabsList className="bg-transparent h-auto p-0 gap-4">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.label}
                value={tab.label}
                className={cn(
                  'px-0 py-1 text-xs font-medium rounded-none bg-transparent',
                  'data-[state=active]:text-white data-[state=active]:bg-transparent',
                  'data-[state=active]:border-b-2 data-[state=active]:border-blue-400',
                  'data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-300'
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {filename && (
            <span className="text-xs text-gray-500 font-mono">{filename}</span>
          )}
        </div>
        
        {tabs.map((tab) => (
          <TabsContent key={tab.label} value={tab.label} className="mt-0">
            <div className="relative">
              <SyntaxHighlighter
                language={tab.language}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '0.875rem',
                }}
              >
                {tab.code.trim()}
              </SyntaxHighlighter>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      
      <button
        onClick={copyToClipboard}
        className={cn(
          'absolute top-12 right-2 p-2 rounded-md transition-all',
          'bg-white/5 opacity-0 group-hover:opacity-100',
          'hover:bg-white/10 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
        )}
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  )
}
