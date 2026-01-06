// Python brand colors + syntax highlighting for the landing page

// Pulled from python.org branding guidelines
export const python = {
  blue: {
    dark: '#306998',
    DEFAULT: '#4B8BBE',
    light: '#6BA3D6',
    glow: 'rgba(75, 139, 190, 0.25)',
    glowStrong: 'rgba(75, 139, 190, 0.4)',
  },
  yellow: {
    dark: '#E5C33B',
    DEFAULT: '#FFD43B',
    light: '#FFE873',
    glow: 'rgba(255, 212, 59, 0.2)',
    glowStrong: 'rgba(255, 212, 59, 0.35)',
  },
} as const;

// Dracula-ish syntax colors (what devs expect from VS Code / PyCharm)
export const syntax = {
  keyword: '#FF79C6',      // def, class, import, from, return, if, else
  function: '#50FA7B',     // Function names, method calls
  string: '#F1FA8C',       // Single, double, triple quoted strings
  comment: '#6272A4',      // Comments and docstrings prefix
  variable: '#F8F8F2',     // Variable names
  number: '#BD93F9',       // Integers, floats
  decorator: '#8BE9FD',    // @decorators
  builtin: '#FF79C6',      // Built-in functions like print, len, range
  className: '#8BE9FD',    // Class names
  parameter: '#FFB86C',    // Function parameters
  operator: '#FF79C6',     // Operators like =, ==, +, -
  punctuation: '#F8F8F2',  // Brackets, colons, commas
  docstring: '#6272A4',    // Triple-quoted docstrings
  fstring: '#F1FA8C',      // f-strings
  fstringBrace: '#FF79C6', // Braces inside f-strings
  lineNumber: 'rgba(248, 248, 242, 0.3)',
  lineNumberActive: 'rgba(248, 248, 242, 0.6)',
  lineHighlight: 'rgba(255, 255, 255, 0.05)',
  matchHighlight: 'rgba(255, 212, 59, 0.2)',
  matchBorder: '#FFD43B',
} as const;

// Background layers (GitHub dark palette)
export const codeBg = {
  deep: '#0D1117',       // Deepest layer (GitHub dark)
  primary: '#161B22',    // Main code background
  elevated: '#21262D',   // Code blocks, cards
  hover: '#30363D',      // Hover states
  selection: 'rgba(75, 139, 190, 0.3)',
} as const;

// Repos we'll show in the demo - popular ones people recognize
export const featuredRepos = [
  {
    id: 'flask',
    owner: 'pallets',
    name: 'flask',
    displayName: 'Flask',
    description: 'Lightweight WSGI web framework',
    stars: '67k',
    color: python.blue.DEFAULT,
    defaultQuery: 'authentication middleware',
  },
  {
    id: 'django',
    owner: 'django',
    name: 'django',
    displayName: 'Django',
    description: 'High-level Python web framework',
    stars: '79k',
    color: '#092E20',
    defaultQuery: 'user authentication views',
  },
  {
    id: 'fastapi',
    owner: 'tiangolo',
    name: 'fastapi',
    displayName: 'FastAPI',
    description: 'Modern, fast web framework',
    stars: '76k',
    color: '#009688',
    defaultQuery: 'dependency injection',
  },
  {
    id: 'requests',
    owner: 'psf',
    name: 'requests',
    displayName: 'Requests',
    description: 'HTTP for Humans',
    stars: '52k',
    color: python.yellow.DEFAULT,
    defaultQuery: 'session handling cookies',
  },
  {
    id: 'sqlalchemy',
    owner: 'sqlalchemy',
    name: 'sqlalchemy',
    displayName: 'SQLAlchemy',
    description: 'Database toolkit',
    stars: '9k',
    color: '#D71F00',
    defaultQuery: 'connection pooling',
  },
] as const;

export type FeaturedRepo = typeof featuredRepos[number];

// CSS vars export (for use in vanilla CSS if needed)
export const pythonCSSVars = {
  '--python-blue': python.blue.DEFAULT,
  '--python-blue-dark': python.blue.dark,
  '--python-blue-light': python.blue.light,
  '--python-blue-glow': python.blue.glow,
  '--python-yellow': python.yellow.DEFAULT,
  '--python-yellow-dark': python.yellow.dark,
  '--python-yellow-light': python.yellow.light,
  '--python-yellow-glow': python.yellow.glow,
  '--syntax-keyword': syntax.keyword,
  '--syntax-function': syntax.function,
  '--syntax-string': syntax.string,
  '--syntax-comment': syntax.comment,
  '--syntax-variable': syntax.variable,
  '--syntax-number': syntax.number,
  '--syntax-decorator': syntax.decorator,
  '--syntax-class': syntax.className,
  '--syntax-parameter': syntax.parameter,
  '--code-bg-deep': codeBg.deep,
  '--code-bg-primary': codeBg.primary,
  '--code-bg-elevated': codeBg.elevated,
} as const;

// Inject vars into :root (call once on app init)
export function injectPythonTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(pythonCSSVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
