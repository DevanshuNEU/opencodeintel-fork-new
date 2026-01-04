"""AST-based function extraction using tree-sitter."""
import os
from pathlib import Path
from typing import List, Optional, Dict, Set

import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
from tree_sitter import Language, Parser

from services.search_v2.types import ExtractedFunction
from services.observability import logger

PY_LANGUAGE = Language(tspython.language())
JS_LANGUAGE = Language(tsjavascript.language())

LANGUAGE_MAP: Dict[str, tuple] = {
    '.py': ('python', PY_LANGUAGE),
    '.js': ('javascript', JS_LANGUAGE),
    '.jsx': ('javascript', JS_LANGUAGE),
    '.ts': ('typescript', JS_LANGUAGE),
    '.tsx': ('typescript', JS_LANGUAGE),
}

SKIP_DIRS: Set[str] = {
    'node_modules', '.git', '__pycache__', 'vendor', 'dist',
    'build', '.next', 'coverage', '.pytest_cache', 'venv',
    'env', '.venv', '.env', 'site-packages', '.tox',
    '__tests__', 'tests', 'test', 'spec', 'specs',
    'fixtures', 'mocks', 'stubs',
}

TEST_PATTERNS = (
    '/test.', '.test.', '.spec.', '_test.',
    '/tests/', '/test/', '/__tests__/',
    'conftest.py', 'pytest_', 'unittest_',
)


class TreeSitterExtractor:
    """Extract functions from source code using tree-sitter."""

    MAX_CODE_LENGTH = 3000
    MAX_FUNCTIONS = 5000

    def __init__(self):
        self.parsers: Dict[str, Parser] = {}
        for ext, (lang_name, lang) in LANGUAGE_MAP.items():
            if lang_name not in self.parsers:
                self.parsers[lang_name] = Parser(lang)

    def extract_from_repo(
        self,
        repo_path: Path,
        include_paths: Optional[List[str]] = None,
        exclude_paths: Optional[List[str]] = None,
        max_functions: Optional[int] = None
    ) -> List[ExtractedFunction]:
        """Extract all functions from a repository."""
        max_funcs = max_functions or self.MAX_FUNCTIONS
        functions: List[ExtractedFunction] = []

        for ext, (lang_name, _) in LANGUAGE_MAP.items():
            for file_path in repo_path.rglob(f"*{ext}"):
                rel_path = str(file_path.relative_to(repo_path))

                if self._should_skip(rel_path, include_paths, exclude_paths):
                    continue

                try:
                    code = file_path.read_text(encoding='utf-8', errors='ignore')
                    functions.extend(self.extract_from_code(code, lang_name, rel_path))

                    if len(functions) >= max_funcs:
                        return functions[:max_funcs]
                except Exception:
                    continue

        logger.info("Extraction complete", functions=len(functions))
        return functions

    def extract_from_code(self, code: str, language: str, file_path: str) -> List[ExtractedFunction]:
        """Extract functions from source code string."""
        parser = self.parsers.get(language)
        if not parser:
            return []

        try:
            tree = parser.parse(bytes(code, 'utf-8'))
        except Exception:
            return []

        if language == 'python':
            return self._extract_python(tree, code, file_path)
        elif language in ('javascript', 'typescript'):
            return self._extract_js_ts(tree, code, file_path, language)
        return []

    def _should_skip(self, rel_path: str, include_paths, exclude_paths) -> bool:
        path_parts = rel_path.split(os.sep)
        if any(skip in path_parts for skip in SKIP_DIRS):
            return True
        if any(p in rel_path.lower() for p in TEST_PATTERNS):
            return True
        if include_paths and not any(rel_path.startswith(p) for p in include_paths):
            return True
        if exclude_paths and any(rel_path.startswith(p) for p in exclude_paths):
            return True
        return False

    def _extract_python(self, tree, code: str, file_path: str) -> List[ExtractedFunction]:
        functions: List[ExtractedFunction] = []
        code_bytes = bytes(code, 'utf-8')

        def get_text(node) -> str:
            return code_bytes[node.start_byte:node.end_byte].decode('utf-8')

        def get_docstring(node) -> Optional[str]:
            body = node.child_by_field_name('body')
            if body and body.child_count > 0:
                first = body.children[0]
                if first.type == 'expression_statement' and first.child_count > 0:
                    expr = first.children[0]
                    if expr.type == 'string':
                        doc = get_text(expr)
                        if doc.startswith('"""') or doc.startswith("'''"):
                            return doc[3:-3].strip()
            return None

        def visit(node, class_name=None):
            if node.type == 'function_definition':
                name_node = node.child_by_field_name('name')
                if not name_node:
                    return

                name = get_text(name_node)

                # skip private, keep dunders
                if name.startswith('_') and not name.startswith('__'):
                    for child in node.children:
                        visit(child, class_name)
                    return

                params_node = node.child_by_field_name('parameters')
                params = get_text(params_node) if params_node else '()'

                is_async = any(c.type == 'async' for c in node.children if hasattr(c, 'type'))

                return_type = node.child_by_field_name('return_type')
                return_hint = f" -> {get_text(return_type)}" if return_type else ""

                signature = f"{'async ' if is_async else ''}def {name}{params}{return_hint}:"
                qualified_name = f"{class_name}.{name}" if class_name else name

                functions.append(ExtractedFunction(
                    name=name,
                    qualified_name=qualified_name,
                    file_path=file_path,
                    code=get_text(node)[:self.MAX_CODE_LENGTH],
                    signature=signature,
                    language='python',
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    class_name=class_name,
                    docstring=get_docstring(node),
                    is_async=is_async,
                    is_method=class_name is not None,
                ))

            elif node.type == 'class_definition':
                cname_node = node.child_by_field_name('name')
                if cname_node:
                    for child in node.children:
                        visit(child, get_text(cname_node))
                return

            for child in node.children:
                visit(child, class_name)

        visit(tree.root_node)
        return functions

    def _extract_js_ts(self, tree, code: str, file_path: str, language: str) -> List[ExtractedFunction]:
        functions: List[ExtractedFunction] = []
        code_bytes = bytes(code, 'utf-8')

        def get_text(node) -> str:
            return code_bytes[node.start_byte:node.end_byte].decode('utf-8')

        def get_name(node) -> Optional[str]:
            name_node = node.child_by_field_name('name')
            return get_text(name_node) if name_node else None

        def visit(node, class_name=None):
            # arrow functions in variable declarations
            if node.type in ('lexical_declaration', 'variable_declaration'):
                for child in node.children:
                    if child.type == 'variable_declarator':
                        name_node = child.child_by_field_name('name')
                        value_node = child.child_by_field_name('value')

                        if name_node and value_node and value_node.type in ('arrow_function', 'function_expression'):
                            name = get_text(name_node)
                            if name.startswith('_'):
                                continue

                            func_code = get_text(node)
                            params_node = value_node.child_by_field_name('parameters')
                            params = get_text(params_node) if params_node else '()'

                            is_async = 'async' in func_code[:50]
                            is_exported = func_code.strip().startswith('export')

                            functions.append(ExtractedFunction(
                                name=name,
                                qualified_name=f"{class_name}.{name}" if class_name else name,
                                file_path=file_path,
                                code=func_code[:self.MAX_CODE_LENGTH],
                                signature=f"{'export ' if is_exported else ''}const {name} = {'async ' if is_async else ''}{params} =>",
                                language=language,
                                start_line=node.start_point[0] + 1,
                                end_line=node.end_point[0] + 1,
                                class_name=class_name,
                                is_async=is_async,
                                is_method=class_name is not None,
                            ))
                return

            if node.type == 'function_declaration':
                name = get_name(node)
                if name:
                    func_code = get_text(node)
                    params_node = node.child_by_field_name('parameters')
                    params = get_text(params_node) if params_node else '()'

                    is_async = any(c.type == 'async' for c in node.children)
                    is_exported = node.parent and node.parent.type == 'export_statement'

                    functions.append(ExtractedFunction(
                        name=name,
                        qualified_name=f"{class_name}.{name}" if class_name else name,
                        file_path=file_path,
                        code=func_code[:self.MAX_CODE_LENGTH],
                        signature=f"{'export ' if is_exported else ''}{'async ' if is_async else ''}function {name}{params}",
                        language=language,
                        start_line=node.start_point[0] + 1,
                        end_line=node.end_point[0] + 1,
                        class_name=class_name,
                        is_async=is_async,
                        is_method=class_name is not None,
                    ))

            elif node.type == 'method_definition':
                name = get_name(node)
                if name and not name.startswith('_'):
                    func_code = get_text(node)
                    params_node = node.child_by_field_name('parameters')
                    params = get_text(params_node) if params_node else '()'
                    is_async = any(c.type == 'async' for c in node.children)

                    functions.append(ExtractedFunction(
                        name=name,
                        qualified_name=f"{class_name}.{name}" if class_name else name,
                        file_path=file_path,
                        code=func_code[:self.MAX_CODE_LENGTH],
                        signature=f"{'async ' if is_async else ''}{name}{params}",
                        language=language,
                        start_line=node.start_point[0] + 1,
                        end_line=node.end_point[0] + 1,
                        class_name=class_name,
                        is_async=is_async,
                        is_method=True,
                    ))

            elif node.type == 'class_declaration':
                cname_node = node.child_by_field_name('name')
                if cname_node:
                    for child in node.children:
                        visit(child, get_text(cname_node))
                return

            for child in node.children:
                visit(child, class_name)

        visit(tree.root_node)
        return functions
