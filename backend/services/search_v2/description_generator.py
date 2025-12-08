"""
Description Generator for Semantic Search v2

Generates natural language descriptions for code functions.
Key insight from Greptile research: Embed NL descriptions, not raw code.

Why this works:
- User queries are in natural language ("authentication logic")
- Raw code is NOT natural language ("def verify_jwt_token(token):")
- Embedding models work best when both query and document are in same "language"
- NL description of code bridges this gap → better semantic matches
"""
import os
import asyncio
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from openai import AsyncOpenAI
from dotenv import load_dotenv
import time
import hashlib

load_dotenv()


@dataclass
class FunctionDescription:
    """Generated description for a code function"""
    function_name: str
    file_path: str
    description: str
    keywords: List[str]  # Additional searchable terms
    generated_at: float
    model_used: str
    token_count: int


class DescriptionGenerator:
    """
    Generates natural language descriptions for code functions.
    
    Uses GPT-4o-mini for cost efficiency (~$0.10 per 1000 functions).
    Descriptions are optimized for semantic search matching.
    """
    
    # Model configuration
    MODEL = "gpt-4o-mini"
    MAX_CODE_LENGTH = 3000  # Truncate very long functions
    BATCH_SIZE = 10  # Process functions in parallel batches
    
    # System prompt optimized for searchable descriptions
    SYSTEM_PROMPT = """You are a code documentation expert. Your task is to generate concise, searchable descriptions for code functions.

RULES:
1. Describe WHAT the function does, not HOW it does it
2. Use common programming terminology that developers would search for
3. Include the purpose, inputs, and outputs
4. Keep descriptions to 1-2 sentences (max 50 words)
5. Use natural language, not code syntax
6. Include relevant domain terms (auth, database, API, validation, etc.)

GOOD EXAMPLE:
Code: def verify_jwt_token(token: str) -> dict
Description: "Verifies and decodes a JWT authentication token, returning the user payload if valid. Handles token expiration and signature validation."

BAD EXAMPLE (too technical):
"Calls jwt.decode with HS256 algorithm on the token parameter and returns payload dict"

Respond with ONLY the description, no quotes or prefixes."""

    def __init__(self, openai_client: Optional[AsyncOpenAI] = None):
        self.client = openai_client or AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.total_tokens_used = 0
        self.total_cost = 0.0
        
    async def generate_description(
        self, 
        code: str, 
        function_name: str,
        file_path: str,
        language: str
    ) -> FunctionDescription:
        """
        Generate a natural language description for a single function.
        
        Args:
            code: The function source code
            function_name: Name of the function
            file_path: Path to the source file
            language: Programming language (python, javascript, etc.)
            
        Returns:
            FunctionDescription with generated text
        """
        # Truncate very long functions
        truncated_code = code[:self.MAX_CODE_LENGTH]
        if len(code) > self.MAX_CODE_LENGTH:
            truncated_code += "\n... (truncated)"
        
        # Build context-aware prompt
        user_prompt = f"""Language: {language}
File: {file_path}
Function: {function_name}

```{language}
{truncated_code}
```

Generate a searchable description:"""

        try:
            start_time = time.time()
            
            response = await self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=100,
                temperature=0.3,  # Low temp for consistent outputs
            )
            
            description = response.choices[0].message.content.strip()
            tokens_used = response.usage.total_tokens if response.usage else 0
            
            # Track costs (GPT-4o-mini pricing)
            self.total_tokens_used += tokens_used
            self.total_cost += (tokens_used / 1_000_000) * 0.15  # Approximate
            
            # Extract keywords from description
            keywords = self._extract_keywords(description, function_name)
            
            return FunctionDescription(
                function_name=function_name,
                file_path=file_path,
                description=description,
                keywords=keywords,
                generated_at=time.time(),
                model_used=self.MODEL,
                token_count=tokens_used
            )
            
        except Exception as e:
            print(f"⚠️ Description generation failed for {function_name}: {e}")
            # Fallback: Create basic description from function name
            fallback_desc = self._create_fallback_description(function_name, language)
            return FunctionDescription(
                function_name=function_name,
                file_path=file_path,
                description=fallback_desc,
                keywords=[function_name],
                generated_at=time.time(),
                model_used="fallback",
                token_count=0
            )
    
    async def generate_descriptions_batch(
        self,
        functions: List[Dict],
        progress_callback=None
    ) -> List[FunctionDescription]:
        """
        Generate descriptions for multiple functions in parallel batches.
        
        Args:
            functions: List of function dicts with keys: code, name, file_path, language
            progress_callback: Optional async callback(processed, total)
            
        Returns:
            List of FunctionDescription objects
        """
        total = len(functions)
        results = []
        
        print(f"🧠 Generating NL descriptions for {total} functions...")
        print(f"   Model: {self.MODEL}")
        print(f"   Batch size: {self.BATCH_SIZE}")
        
        for i in range(0, total, self.BATCH_SIZE):
            batch = functions[i:i + self.BATCH_SIZE]
            
            # Process batch in parallel
            batch_tasks = [
                self.generate_description(
                    code=func.get("code", ""),
                    function_name=func.get("name", "unknown"),
                    file_path=func.get("file_path", ""),
                    language=func.get("language", "python")
                )
                for func in batch
            ]
            
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Collect successful results
            for result in batch_results:
                if isinstance(result, FunctionDescription):
                    results.append(result)
                elif isinstance(result, Exception):
                    print(f"   ❌ Batch error: {result}")
            
            processed = min(i + self.BATCH_SIZE, total)
            print(f"   Generated {processed}/{total} descriptions")
            
            if progress_callback:
                await progress_callback(processed, total)
        
        print(f"✅ Description generation complete!")
        print(f"   Total tokens: {self.total_tokens_used:,}")
        print(f"   Estimated cost: ${self.total_cost:.4f}")
        
        return results
    
    def _extract_keywords(self, description: str, function_name: str) -> List[str]:
        """Extract searchable keywords from description and function name."""
        keywords = set()
        
        # Add function name parts (split camelCase and snake_case)
        import re
        name_parts = re.split(r'[_\s]|(?=[A-Z])', function_name)
        keywords.update(part.lower() for part in name_parts if len(part) > 2)
        
        # Common programming keywords to look for
        common_terms = [
            "authentication", "auth", "login", "logout", "session",
            "database", "query", "fetch", "save", "delete", "update",
            "api", "request", "response", "endpoint", "route",
            "validation", "validate", "check", "verify",
            "error", "exception", "handle", "catch",
            "file", "read", "write", "parse", "format",
            "user", "admin", "permission", "role",
            "cache", "store", "retrieve", "memory",
            "encrypt", "decrypt", "hash", "token", "jwt",
            "email", "notification", "send", "message",
            "test", "mock", "assert", "expect",
            "config", "setting", "environment", "initialize",
            "async", "await", "promise", "callback",
            "middleware", "handler", "controller", "service",
        ]
        
        desc_lower = description.lower()
        for term in common_terms:
            if term in desc_lower:
                keywords.add(term)
        
        return list(keywords)[:15]  # Limit to 15 keywords
    
    def _create_fallback_description(self, function_name: str, language: str) -> str:
        """Create a basic description when LLM fails."""
        # Convert function name to readable text
        import re
        
        # Split camelCase and snake_case
        words = re.split(r'[_\s]|(?=[A-Z])', function_name)
        words = [w.lower() for w in words if w]
        
        readable_name = " ".join(words)
        return f"A {language} function that {readable_name}"
    
    def get_stats(self) -> Dict:
        """Get generation statistics."""
        return {
            "total_tokens_used": self.total_tokens_used,
            "estimated_cost_usd": round(self.total_cost, 4),
            "model": self.MODEL
        }
