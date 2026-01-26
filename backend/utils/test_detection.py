"""
Shared test file detection utilities.
Single source of truth for test file patterns across V2/V3 search.
"""
import re
from typing import List


# Regex patterns for test files (consolidated from CodeGraphRanker)
TEST_PATTERNS = [
    r'test[s]?[/_]',          # test/, tests/, test_
    r'[/_]test[s]?\.py$',     # _test.py, _tests.py
    r'\.test\.[jt]sx?$',      # .test.js, .test.ts
    r'\.spec\.[jt]sx?$',      # .spec.js, .spec.ts  
    r'__tests__',             # __tests__/
    r'conftest\.py$',         # pytest config
    r'fixtures?[/_]',         # fixtures/
    r'mock[s]?[/_]',          # mocks/
]


def is_test_file(file_path: str) -> bool:
    """
    Check if file is a test file using regex patterns.
    
    Args:
        file_path: Path to check (can be relative or absolute)
        
    Returns:
        True if file matches any test pattern
    """
    if not file_path:
        return False
    file_path_lower = file_path.lower()
    for pattern in TEST_PATTERNS:
        if re.search(pattern, file_path_lower):
            return True
    return False


def filter_test_files(results: List[dict], include_tests: bool = False) -> List[dict]:
    """
    Filter test files from search results.
    
    Args:
        results: List of search result dicts with 'file_path' key
        include_tests: If True, keep test files; if False, filter them out
        
    Returns:
        Filtered results list
    """
    if include_tests:
        return results
    return [r for r in results if not is_test_file(r.get("file_path", ""))]


def has_test_file_in_top_n(results: List[dict], n: int = 3) -> bool:
    """
    Check if any of the top N results are test files.
    Useful for benchmarking test pollution.
    
    Args:
        results: List of search result dicts
        n: Number of top results to check
        
    Returns:
        True if any top N result is a test file
    """
    for r in results[:n]:
        if is_test_file(r.get("file_path", "")):
            return True
    return False
