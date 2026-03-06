"""
Tests for DependencyAnalyzer -- TypeScript parsing, import resolution, include_paths
"""
import pytest
from pathlib import Path


@pytest.fixture
def analyzer():
    """Create a fresh DependencyAnalyzer instance"""
    from services.dependency_analyzer import DependencyAnalyzer
    return DependencyAnalyzer()


@pytest.fixture
def ts_repo(tmp_path):
    """Create a minimal TypeScript repo structure for testing"""
    # packages/effect/src/Option.ts
    pkg_effect = tmp_path / "packages" / "effect" / "src"
    pkg_effect.mkdir(parents=True)
    (pkg_effect / "Option.ts").write_text('''
import type { Effect } from "./Effect.js"
import { pipe, flow } from "./Function.js"
import * as Predicate from "./Predicate.js"
export { type TypeLambda } from "./HKT.js"
''')
    (pkg_effect / "Effect.ts").write_text('''
import { pipe } from "./Function.js"
import type { Context } from "./Context.js"
''')
    (pkg_effect / "Function.ts").write_text('''
export const pipe = (...args: any[]) => args
export const flow = (...args: any[]) => args
''')
    (pkg_effect / "Predicate.ts").write_text('''
export const isString = (u: unknown): u is string => typeof u === "string"
''')
    (pkg_effect / "HKT.ts").write_text('''
export interface TypeLambda { readonly _A: unknown }
''')
    (pkg_effect / "Context.ts").write_text('''
export interface Context<A> { readonly _tag: "Context" }
''')

    # packages/schema/src/Schema.ts
    pkg_schema = tmp_path / "packages" / "schema" / "src"
    pkg_schema.mkdir(parents=True)
    (pkg_schema / "Schema.ts").write_text('''
import * as Option from "../../effect/src/Option.js"
import { pipe } from "../../effect/src/Function.js"
''')

    # Python file that should be excluded for TS repos
    backend = tmp_path / "backend"
    backend.mkdir()
    (backend / "main.py").write_text('''
from fastapi import FastAPI
import os
''')

    return tmp_path


@pytest.fixture
def tsx_repo(tmp_path):
    """Create a minimal TSX repo for testing"""
    src = tmp_path / "src" / "components"
    src.mkdir(parents=True)
    (src / "Button.tsx").write_text('''
import React from "react"
import { cn } from "../utils.js"
import type { ButtonProps } from "./types.js"
export function Button({ children }: ButtonProps) { return <button>{children}</button> }
''')
    (tmp_path / "src" / "utils.ts").write_text('''
export function cn(...args: string[]) { return args.join(" ") }
''')
    (src / "types.ts").write_text('''
export interface ButtonProps { children: React.ReactNode }
''')
    return tmp_path


class TestParserInitialization:
    """Verify correct tree-sitter parsers are loaded"""

    def test_has_typescript_parser(self, analyzer):
        assert 'typescript' in analyzer.parsers

    def test_has_tsx_parser(self, analyzer):
        assert 'tsx' in analyzer.parsers

    def test_has_python_parser(self, analyzer):
        assert 'python' in analyzer.parsers

    def test_has_javascript_parser(self, analyzer):
        assert 'javascript' in analyzer.parsers

    def test_ts_parser_is_not_js(self, analyzer):
        """The TS parser must NOT be the JS parser (the original bug)"""
        ts_parser = analyzer.parsers['typescript']
        js_parser = analyzer.parsers['javascript']
        # They should be different Language objects
        assert ts_parser is not js_parser

    def test_has_ts_parser_flag(self, analyzer):
        assert analyzer.has_ts_parser is True

    def test_fallback_when_ts_parser_missing(self, monkeypatch, tmp_path):
        """App must not crash if tree-sitter-typescript is missing"""
        import services.dependency_analyzer as mod
        monkeypatch.setattr(mod, '_HAS_TS_PARSER', False)
        from services.dependency_analyzer import DependencyAnalyzer
        fallback = DependencyAnalyzer()
        # Should initialize without error
        assert fallback.has_ts_parser is False
        # Should still parse TS files (using JS fallback)
        ts_file = tmp_path / "test.ts"
        ts_file.write_text('import { foo } from "./bar"')
        result = fallback.analyze_file_dependencies(str(ts_file))
        assert './bar' in result['imports']


class TestLanguageDetection:
    """Verify file extension to language mapping"""

    def test_ts_detected(self, analyzer):
        assert analyzer._detect_language("src/index.ts") == "typescript"

    def test_tsx_detected(self, analyzer):
        assert analyzer._detect_language("src/App.tsx") == "tsx"

    def test_js_detected(self, analyzer):
        assert analyzer._detect_language("lib/utils.js") == "javascript"

    def test_jsx_detected(self, analyzer):
        assert analyzer._detect_language("src/App.jsx") == "javascript"

    def test_py_detected(self, analyzer):
        assert analyzer._detect_language("backend/main.py") == "python"

    def test_unknown_extension(self, analyzer):
        assert analyzer._detect_language("README.md") == "unknown"


class TestTypeScriptImportExtraction:
    """Verify TS import/export patterns are correctly extracted"""

    def test_basic_ts_imports(self, analyzer, ts_repo):
        """Standard TS import with .js extension (nodenext convention)"""
        result = analyzer.analyze_file_dependencies(
            str(ts_repo / "packages/effect/src/Option.ts")
        )
        imports = set(result['imports'])
        assert "./Effect.js" in imports
        assert "./Function.js" in imports
        assert "./Predicate.js" in imports

    def test_type_imports(self, analyzer, ts_repo):
        """import type should be detected"""
        result = analyzer.analyze_file_dependencies(
            str(ts_repo / "packages/effect/src/Option.ts")
        )
        imports = set(result['imports'])
        assert "./Effect.js" in imports  # import type { Effect } from "./Effect.js"

    def test_re_exports(self, analyzer, ts_repo):
        """export { x } from should be detected"""
        result = analyzer.analyze_file_dependencies(
            str(ts_repo / "packages/effect/src/Option.ts")
        )
        imports = set(result['imports'])
        assert "./HKT.js" in imports  # export { type TypeLambda } from "./HKT.js"

    def test_tsx_imports(self, analyzer, tsx_repo):
        """TSX files should be parsed without errors"""
        result = analyzer.analyze_file_dependencies(
            str(tsx_repo / "src/components/Button.tsx")
        )
        imports = set(result['imports'])
        assert "react" in imports
        assert "../utils.js" in imports
        assert "./types.js" in imports

    def test_import_count(self, analyzer, ts_repo):
        result = analyzer.analyze_file_dependencies(
            str(ts_repo / "packages/effect/src/Option.ts")
        )
        assert result['import_count'] == 4  # Effect, Function, Predicate, HKT


class TestImportResolution:
    """Verify .js -> .ts resolution and relative path handling"""

    def test_js_extension_resolves_to_ts(self, analyzer, ts_repo):
        """import from './Function.js' should resolve to Function.ts"""
        graph = analyzer.build_dependency_graph(str(ts_repo))
        deps = graph['dependencies']
        assert 'packages/effect/src/Option.ts' in deps

        # Function.js should resolve to Function.ts
        resolved_targets = set()
        for edge in graph['edges']:
            if edge['source'] == 'packages/effect/src/Option.ts':
                resolved_targets.add(edge['target'])

        assert 'packages/effect/src/Function.ts' in resolved_targets

    def test_relative_imports_resolve(self, analyzer, ts_repo):
        """Relative paths should resolve to actual files"""
        graph = analyzer.build_dependency_graph(str(ts_repo))
        edges_from_option = [
            e['target'] for e in graph['edges']
            if e['source'] == 'packages/effect/src/Option.ts'
        ]
        # Should resolve at least some internal deps
        assert len(edges_from_option) > 0

    def test_d_ts_files_are_discovered(self, analyzer, tmp_path):
        """Imports resolving to .d.ts files should produce edges"""
        src = tmp_path / "src"
        src.mkdir()
        (src / "index.ts").write_text('import { Config } from "./config.js"')
        (src / "config.d.ts").write_text('export interface Config { port: number }')

        graph = analyzer.build_dependency_graph(str(tmp_path))
        file_paths = set(graph['dependencies'].keys())
        assert 'src/config.d.ts' in file_paths
        targets = [e['target'] for e in graph['edges'] if e['source'] == 'src/index.ts']
        assert 'src/config.d.ts' in targets


class TestIncludePaths:
    """Verify include_paths filtering works correctly"""

    def test_without_include_paths_scans_everything(self, analyzer, ts_repo):
        """No include_paths should scan all files"""
        graph = analyzer.build_dependency_graph(str(ts_repo))
        file_paths = set(graph['dependencies'].keys())
        # Should include both packages AND backend
        assert any('backend' in f for f in file_paths)
        assert any('packages/effect' in f for f in file_paths)

    def test_include_paths_filters_to_subset(self, analyzer, ts_repo):
        """include_paths should restrict to specified directories"""
        graph = analyzer.build_dependency_graph(
            str(ts_repo),
            include_paths=['packages/effect']
        )
        file_paths = set(graph['dependencies'].keys())
        # Should only have effect package files
        assert all('packages/effect' in f for f in file_paths)
        # Should NOT have backend files
        assert not any('backend' in f for f in file_paths)
        # Should NOT have schema files
        assert not any('packages/schema' in f for f in file_paths)

    def test_include_paths_no_prefix_confusion(self, analyzer, tmp_path):
        """'src/app' must not match 'src/application'"""
        (tmp_path / "src" / "app").mkdir(parents=True)
        (tmp_path / "src" / "application").mkdir(parents=True)
        (tmp_path / "src" / "app" / "index.ts").write_text('export const x = 1')
        (tmp_path / "src" / "application" / "index.ts").write_text('export const y = 2')

        graph = analyzer.build_dependency_graph(
            str(tmp_path), include_paths=['src/app']
        )
        file_paths = set(graph['dependencies'].keys())
        assert any('src/app/index.ts' in f for f in file_paths)
        assert not any('src/application' in f for f in file_paths)

    def test_include_paths_multiple_dirs(self, analyzer, ts_repo):
        """Multiple include_paths should include all specified dirs"""
        graph = analyzer.build_dependency_graph(
            str(ts_repo),
            include_paths=['packages/effect', 'packages/schema']
        )
        file_paths = set(graph['dependencies'].keys())
        assert any('packages/effect' in f for f in file_paths)
        assert any('packages/schema' in f for f in file_paths)
        assert not any('backend' in f for f in file_paths)

    def test_include_paths_with_corrupt_data(self, analyzer, ts_repo):
        """Corrupt jsonb from DB should not crash -- non-strings are filtered out"""
        graph = analyzer.build_dependency_graph(
            str(ts_repo),
            include_paths=[123, None, '', 'packages/effect', True]
        )
        file_paths = set(graph['dependencies'].keys())
        # Should only include effect files, corrupt entries filtered
        assert all('packages/effect' in f for f in file_paths)
        assert len(file_paths) > 0

    def test_include_paths_all_corrupt_scans_everything(self, analyzer, ts_repo):
        """If all include_paths entries are invalid, fall back to full scan"""
        graph = analyzer.build_dependency_graph(
            str(ts_repo),
            include_paths=[123, None, '', False]
        )
        file_paths = set(graph['dependencies'].keys())
        # Should fall back to scanning everything
        assert any('backend' in f for f in file_paths)
        assert any('packages/effect' in f for f in file_paths)

    def test_include_paths_empty_list_scans_everything(self, analyzer, ts_repo):
        """Empty list should be treated same as None"""
        graph = analyzer.build_dependency_graph(str(ts_repo), include_paths=[])
        file_paths = set(graph['dependencies'].keys())
        assert any('backend' in f for f in file_paths)


class TestGraphMetrics:
    """Verify graph statistics are correct"""

    def test_node_count_matches_files(self, analyzer, ts_repo):
        graph = analyzer.build_dependency_graph(
            str(ts_repo),
            include_paths=['packages/effect']
        )
        nodes = graph['nodes']
        deps = graph['dependencies']
        assert len(nodes) == len(deps)

    def test_edges_are_valid(self, analyzer, ts_repo):
        """Every edge source and target should be a known file"""
        graph = analyzer.build_dependency_graph(str(ts_repo))
        known_files = set(graph['dependencies'].keys())
        for edge in graph['edges']:
            assert edge['source'] in known_files, f"Unknown source: {edge['source']}"
            assert edge['target'] in known_files, f"Unknown target: {edge['target']}"

    def test_metrics_have_required_fields(self, analyzer, ts_repo):
        graph = analyzer.build_dependency_graph(str(ts_repo))
        metrics = graph['metrics']
        assert 'most_critical_files' in metrics
        assert 'most_complex_files' in metrics
        assert 'avg_dependencies' in metrics
        assert 'total_edges' in metrics


class TestPythonImports:
    """Verify Python import extraction still works (regression test)"""

    def test_python_from_import(self, analyzer, ts_repo):
        result = analyzer.analyze_file_dependencies(
            str(ts_repo / "backend" / "main.py")
        )
        imports = set(result['imports'])
        assert 'fastapi' in imports
        assert 'os' in imports

    def test_python_language_detected(self, analyzer, ts_repo):
        result = analyzer.analyze_file_dependencies(
            str(ts_repo / "backend" / "main.py")
        )
        assert result['language'] == 'python'
