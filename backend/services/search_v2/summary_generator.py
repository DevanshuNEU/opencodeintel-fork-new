"""Generate concise summaries for functions using GPT-4o-mini."""
import asyncio
from typing import List, Optional
from openai import AsyncOpenAI

from services.search_v2.types import ExtractedFunction
from services.observability import logger

SUMMARY_PROMPT = """Summarize what this function does in one sentence (max 15 words).
Focus on the purpose, not implementation details. Be specific.

Function: {name}
Signature: {signature}
Code:
```{language}
{code}
```

Summary:"""

BATCH_PROMPT = """For each function below, write a one-sentence summary (max 15 words each).
Focus on purpose, not implementation. Be specific. Return one summary per line.

{functions}

Summaries (one per line):"""


class SummaryGenerator:
    """Generate function summaries using GPT-4o-mini."""

    def __init__(self, model: str = "gpt-4o-mini", batch_size: int = 10):
        self.client = AsyncOpenAI()
        self.model = model
        self.batch_size = batch_size

    async def generate_single(self, func: ExtractedFunction) -> str:
        """Generate summary for a single function."""
        prompt = SUMMARY_PROMPT.format(
            name=func.qualified_name,
            signature=func.signature,
            language=func.language,
            code=func.code[:1500],
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning("Summary generation failed", func=func.name, error=str(e))
            return ""

    async def generate_batch(self, functions: List[ExtractedFunction]) -> List[str]:
        """Generate summaries for multiple functions in one API call."""
        if not functions:
            return []

        func_texts = []
        for i, func in enumerate(functions, 1):
            func_texts.append(
                f"{i}. {func.qualified_name}\n"
                f"   Signature: {func.signature}\n"
                f"   Code: {func.code[:800]}\n"
            )

        prompt = BATCH_PROMPT.format(functions="\n".join(func_texts))

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50 * len(functions),
                temperature=0.3,
            )

            lines = response.choices[0].message.content.strip().split("\n")
            summaries = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue
                # strip leading number if present (e.g., "1. Summary here")
                if line[0].isdigit() and ". " in line[:4]:
                    line = line.split(". ", 1)[1]
                summaries.append(line)

            # pad with empty strings if we got fewer summaries
            while len(summaries) < len(functions):
                summaries.append("")

            return summaries[:len(functions)]

        except Exception as e:
            logger.warning("Batch summary failed", count=len(functions), error=str(e))
            return [""] * len(functions)

    async def generate_all(
        self,
        functions: List[ExtractedFunction],
        progress_callback=None
    ) -> List[str]:
        """Generate summaries for all functions with batching."""
        all_summaries = []
        total = len(functions)

        for i in range(0, total, self.batch_size):
            batch = functions[i:i + self.batch_size]
            summaries = await self.generate_batch(batch)
            all_summaries.extend(summaries)

            if progress_callback:
                await progress_callback(len(all_summaries), total)

            logger.debug("Summaries generated", progress=len(all_summaries), total=total)

        return all_summaries


async def generate_summaries(
    functions: List[ExtractedFunction],
    batch_size: int = 10,
    progress_callback=None
) -> List[str]:
    """Convenience function to generate summaries."""
    generator = SummaryGenerator(batch_size=batch_size)
    return await generator.generate_all(functions, progress_callback)
