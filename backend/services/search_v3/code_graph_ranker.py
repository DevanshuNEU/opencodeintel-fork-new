"""
Code Graph Ranker - Boost search results based on code importance
Uses dependency graph to calculate "PageRank-style" importance scores
"""
import re
from typing import Dict, List, Optional, Set
from dataclasses import dataclass

from services.observability import logger


@dataclass
class FileImportance:
    """Importance metrics for a file"""
    file_path: str
    importance_score: float  # 0-1, higher = more important
    dependent_count: int     # how many files depend on this
    is_test_file: bool
    is_exported: bool        # has public exports


class CodeGraphRanker:
    """
    Ranks search results based on code structure and importance
    
    Factors:
    1. Dependency count (more dependents = more important)
    2. Test file penalty (tests are less relevant for most queries)
    3. Export/public boost (public APIs are usually more relevant)
    4. Core file boost (main, index, app files)
    """
    
    # patterns for test files
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
    
    # patterns for core files (boost these)
    CORE_PATTERNS = [
        r'main\.[a-z]+$',
        r'index\.[a-z]+$',
        r'app\.[a-z]+$',
        r'server\.[a-z]+$',
        r'api\.[a-z]+$',
        r'routes?\.[a-z]+$',
        r'models?\.[a-z]+$',
        r'services?[/_]',
        r'controllers?[/_]',
    ]
    
    # penalty/boost factors
    TEST_FILE_PENALTY = 0.5     # multiply score by this for test files
    CORE_FILE_BOOST = 1.3       # multiply score by this for core files
    HIGH_DEPENDENCY_BOOST = 1.5 # boost for files with many dependents
    
    def __init__(self):
        self._importance_cache: Dict[str, Dict[str, FileImportance]] = {}
        logger.info("CodeGraphRanker initialized")
    
    def calculate_importance(
        self, 
        repo_id: str,
        file_dependencies: Dict[str, List[str]]
    ) -> Dict[str, FileImportance]:
        """
        Calculate importance scores for all files in a repo
        
        Args:
            repo_id: Repository identifier
            file_dependencies: Dict of file_path -> list of files it depends on
        """
        # check cache
        if repo_id in self._importance_cache:
            return self._importance_cache[repo_id]
        
        importance_map = {}
        
        # calculate dependent count (reverse of dependencies)
        dependent_counts: Dict[str, int] = {}
        for file_path, deps in file_dependencies.items():
            for dep in deps:
                dependent_counts[dep] = dependent_counts.get(dep, 0) + 1
        
        # find max for normalization
        max_dependents = max(dependent_counts.values()) if dependent_counts else 1
        
        # calculate importance for each file (include files that only appear as dependencies)
        all_files = set(file_dependencies.keys()) | set(dependent_counts.keys())
        for file_path in all_files:
            is_test = self._is_test_file(file_path)
            is_core = self._is_core_file(file_path)
            dep_count = dependent_counts.get(file_path, 0)
            
            # base score from dependency count (normalized 0-1)
            base_score = dep_count / max_dependents if max_dependents > 0 else 0
            
            # apply modifiers
            score = 0.3 + (base_score * 0.7)  # base 0.3, max 1.0
            
            if is_test:
                score *= self.TEST_FILE_PENALTY
            
            if is_core:
                score *= self.CORE_FILE_BOOST
            
            if dep_count >= 5:  # highly depended upon
                score *= self.HIGH_DEPENDENCY_BOOST
            
            # clamp to 0-1
            score = min(1.0, max(0.0, score))
            
            importance_map[file_path] = FileImportance(
                file_path=file_path,
                importance_score=score,
                dependent_count=dep_count,
                is_test_file=is_test,
                is_exported=is_core  # simplified
            )
        
        # cache it
        self._importance_cache[repo_id] = importance_map
        
        logger.info("Calculated importance scores", 
                   repo_id=repo_id, 
                   file_count=len(importance_map),
                   test_files=sum(1 for f in importance_map.values() if f.is_test_file))
        
        return importance_map
    
    def _is_test_file(self, file_path: str) -> bool:
        """Check if file is a test file"""
        file_path_lower = file_path.lower()
        for pattern in self.TEST_PATTERNS:
            if re.search(pattern, file_path_lower):
                return True
        return False
    
    def _is_core_file(self, file_path: str) -> bool:
        """Check if file is a core/important file"""
        file_path_lower = file_path.lower()
        for pattern in self.CORE_PATTERNS:
            if re.search(pattern, file_path_lower):
                return True
        return False
    
    def boost_results(
        self,
        results: List[Dict],
        importance_map: Dict[str, FileImportance],
        include_tests: bool = False
    ) -> List[Dict]:
        """
        Apply importance boosting to search results
        
        Args:
            results: List of search results with 'file_path' and 'score'
            importance_map: Pre-calculated importance scores
            include_tests: Whether to include test files (if False, heavily penalize)
        """
        boosted_results = []
        
        for result in results:
            file_path = result.get('file_path', '')
            original_score = result.get('score', 0.5)
            
            # get importance info
            importance = importance_map.get(file_path)
            
            if importance:
                # apply importance boost
                boost_factor = 0.5 + (importance.importance_score * 0.5)
                
                # extra penalty for tests if not wanted
                if importance.is_test_file and not include_tests:
                    boost_factor *= 0.3  # heavy penalty
                
                new_score = original_score * boost_factor
            else:
                # unknown file, slight penalty
                is_test = self._is_test_file(file_path)
                if is_test and not include_tests:
                    new_score = original_score * 0.3
                else:
                    new_score = original_score * 0.8
            
            boosted_result = result.copy()
            boosted_result['score'] = new_score
            boosted_result['original_score'] = original_score
            boosted_result['is_test_file'] = importance.is_test_file if importance else self._is_test_file(file_path)
            
            boosted_results.append(boosted_result)
        
        # re-sort by new score
        boosted_results.sort(key=lambda x: x['score'], reverse=True)
        
        return boosted_results
    
    def filter_test_files(
        self, 
        results: List[Dict], 
        include_tests: bool = False
    ) -> List[Dict]:
        """
        Filter out test files from results
        
        Args:
            results: Search results
            include_tests: If True, keep tests; if False, remove them
        """
        if include_tests:
            return results
        
        filtered = []
        for result in results:
            file_path = result.get('file_path', '')
            if not self._is_test_file(file_path):
                filtered.append(result)
        
        logger.debug("Filtered test files", 
                    original_count=len(results), 
                    filtered_count=len(filtered))
        
        return filtered
    
    def get_test_file_paths(self, file_paths: List[str]) -> Set[str]:
        """Get set of test file paths from a list"""
        return {fp for fp in file_paths if self._is_test_file(fp)}
