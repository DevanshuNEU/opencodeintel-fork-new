"""Data models for Search V2."""
from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum


class Language(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    GO = "go"  # not yet supported
    JAVA = "java"  # not yet supported


@dataclass
class ExtractedFunction:
    """A function or method extracted from source code."""
    name: str
    qualified_name: str  # e.g., "Session.get" for methods
    file_path: str
    code: str
    signature: str
    language: str
    start_line: int
    end_line: int
    class_name: Optional[str] = None
    docstring: Optional[str] = None
    is_async: bool = False
    is_method: bool = False
    decorators: List[str] = field(default_factory=list)

    @property
    def display_name(self) -> str:
        return self.qualified_name if self.class_name else self.name

    @property
    def id_string(self) -> str:
        return f"{self.file_path}:{self.qualified_name}:{self.start_line}"

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "qualified_name": self.qualified_name,
            "file_path": self.file_path,
            "code": self.code,
            "signature": self.signature,
            "language": self.language,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "class_name": self.class_name,
            "docstring": self.docstring,
            "is_async": self.is_async,
            "is_method": self.is_method,
            "decorators": self.decorators,
        }


@dataclass
class SearchResult:
    """Search result with score and optional summary."""
    name: str
    qualified_name: str
    file_path: str
    code: str
    signature: str
    language: str
    score: float
    start_line: int
    end_line: int
    summary: Optional[str] = None
    class_name: Optional[str] = None
    match_reason: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "qualified_name": self.qualified_name,
            "file_path": self.file_path,
            "code": self.code,
            "signature": self.signature,
            "language": self.language,
            "score": self.score,
            "line_start": self.start_line,
            "line_end": self.end_line,
            "summary": self.summary,
            "class_name": self.class_name,
            "match_reason": self.match_reason,
        }
