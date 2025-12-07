# MCP Setup Guide

Most AI coding assistants forget your codebase the moment you close the chat. You explain your auth flow, close the window, come back tomorrow - and Claude has no idea what you're talking about.

CodeIntel fixes this. It's an MCP server that gives Claude (or any MCP-compatible AI) persistent memory of your entire codebase - semantic search, dependency graphs, impact analysis, the works.

Here's how to set it up in under 5 minutes.

---

## What is MCP?

MCP (Model Context Protocol) is Anthropic's open standard for connecting AI assistants to external tools and data sources. Think of it as USB for AI - a universal way to plug in capabilities.

Instead of copy-pasting code into Claude, MCP lets Claude directly search your codebase, analyze dependencies, and understand impact of changes.

**The result?** Claude that actually knows your code.

---

## Prerequisites

Before you start, make sure you have:

- **Claude Desktop** installed ([download here](https://claude.ai/download))
- **CodeIntel backend** running (either locally or hosted)
- **Python 3.11+** for the MCP server
- **5 minutes** of your time

---

## Setup Steps

### Step 1: Clone the MCP Server

If you haven't already, grab the CodeIntel repo:

```bash
git clone https://github.com/OpenCodeIntel/opencodeintel.git
cd opencodeintel/mcp-server
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

That's it. No virtual environment drama for a simple MCP server.

### Step 3: Configure Environment

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Where's your CodeIntel backend running?
BACKEND_API_URL=http://localhost:8000

# Your API key (get this from the CodeIntel dashboard)
API_KEY=your-api-key-here
```

**Using hosted CodeIntel?** Replace `localhost:8000` with your hosted URL.

### Step 4: Configure Claude Desktop

This is where the magic happens. You need to tell Claude Desktop about the MCP server.

**Find your config file:**

| OS | Config Location |
|----|-----------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Add CodeIntel to your config:**

```json
{
  "mcpServers": {
    "codeintel": {
      "command": "python",
      "args": ["/absolute/path/to/opencodeintel/mcp-server/server.py"],
      "env": {
        "BACKEND_API_URL": "http://localhost:8000",
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> ⚠️ **Important:** Use the absolute path to `server.py`. Relative paths won't work.

**Example for macOS:**
```json
{
  "mcpServers": {
    "codeintel": {
      "command": "python3",
      "args": ["/Users/yourname/projects/opencodeintel/mcp-server/server.py"],
      "env": {
        "BACKEND_API_URL": "http://localhost:8000",
        "API_KEY": "dev-secret-key"
      }
    }
  }
}
```

### Step 5: Restart Claude Desktop

Completely quit Claude Desktop (not just close the window) and reopen it.

You should see a 🔧 icon in the chat input - that means MCP tools are available.

---

## Available Tools

Once connected, Claude has access to these tools:

### `search_code`
Semantic search across your codebase. Finds code by meaning, not just keywords.

```
"Find authentication middleware"
"Show me error handling patterns"  
"Where's the database connection logic?"
```

### `list_repositories`
See all indexed repositories.

```
"What repos do you have access to?"
"List my codebases"
```

### `get_dependency_graph`
Understand how files connect. See which files are critical (many dependents) vs isolated.

```
"Show me the dependency graph for this repo"
"What files does auth.py depend on?"
```

### `analyze_code_style`
Team patterns: naming conventions, async usage, type hints, common imports.

```
"What coding conventions does this repo use?"
"Is this team using snake_case or camelCase?"
```

### `analyze_impact`
Before you change a file, know what breaks. Shows direct dependents, indirect impact, and related tests.

```
"What happens if I modify src/auth/middleware.py?"
"What's the blast radius of changing this file?"
```

### `get_repository_insights`
High-level overview: file count, critical files, architecture patterns.

```
"Give me an overview of this codebase"
"What are the most important files here?"
```

---

## Example Prompts

Here's how to actually use CodeIntel with Claude:

**Understanding new code:**
> "I just joined this project. Search for the main entry points and explain the architecture."

**Before refactoring:**
> "I want to refactor UserService. What's the impact? What tests cover it?"

**Finding patterns:**
> "How does this codebase handle errors? Find examples of error handling."

**Code review prep:**
> "Search for all usages of the deprecated `oldAuth()` function."

**Matching team style:**
> "Analyze the code style. I want to write a new module that fits in."

---

## Troubleshooting

### Claude doesn't show the 🔧 icon

1. **Check the config path** - Make sure you're editing the right config file
2. **Validate JSON** - A single missing comma breaks everything
3. **Use absolute paths** - Relative paths don't work
4. **Restart fully** - Quit Claude Desktop completely, not just close window

### "Connection refused" errors

Your CodeIntel backend isn't running. Start it:

```bash
cd opencodeintel/backend
python main.py
```

### "Unauthorized" errors

Check your `API_KEY` in both:
- The `.env` file in `mcp-server/`
- The Claude Desktop config

They need to match what your backend expects.

### Tools work but return no results

You probably haven't indexed any repositories yet. Open the CodeIntel dashboard and add a repo first.

### Python command not found

On macOS, you might need `python3` instead of `python`:

```json
{
  "command": "python3",
  "args": ["/path/to/server.py"]
}
```

---

## What's Next?

Once you're set up:

1. **Index a repository** through the CodeIntel dashboard
2. **Start chatting** with Claude about your code
3. **Try impact analysis** before your next refactor

Questions? Issues? [Open a GitHub issue](https://github.com/OpenCodeIntel/opencodeintel/issues) or reach out.

---

*Built because AI assistants shouldn't have amnesia about your code.*
