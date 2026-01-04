"""Filter out low-quality functions from search index."""
from typing import List, Set
from services.search_v2.types import ExtractedFunction
from services.observability import logger

# Junk function name prefixes
JUNK_PREFIXES = (
    'test_', 'time_', 'rand_', 'mock_', 'fake_', 'stub_',
    'setup_', 'teardown_', 'fixture_', 'check_',
    '_test_', '_time_', '_rand_', '_mock_',
    'assert_', 'verify_', 'validate_test',
)

# Junk patterns anywhere in name
JUNK_PATTERNS = (
    '_fixture', '_setup', '_teardown', '_helper_test',
    'benchmark', '_bench', '_perf_',
    '_random_data', '_test_data', '_sample_data',
    'from_int_dict', 'from_test', '_for_test',
    '_for_split', 'create_data_for',
    'doesnt_use_', 'check_main',
)

# Junk file paths
JUNK_PATHS = (
    'tests/', 'test/', 'testing/', '/tests/', '/test/', '/testing/',
    'benchmarks/', 'asv_bench/', 'bench/',
    'examples/', 'docs/', 'doc/',
    '_testing/', 'conftest',
    'fixtures/', '_fixtures/',
    'mock/', 'mocks/', 'stubs/',
)

# Keep these even if they match junk patterns
PUBLIC_API: Set[str] = {
    'read_csv', 'read_excel', 'read_json', 'read_parquet', 'read_sql',
    'to_csv', 'to_excel', 'to_json', 'to_parquet', 'to_sql',
    'merge', 'concat', 'groupby', 'pivot', 'melt',
    'fillna', 'dropna', 'isna', 'notna',
    'apply', 'map', 'transform', 'agg', 'aggregate',
    'sort_values', 'sort_index', 'reset_index', 'set_index',
    'authenticate', 'authorize', 'login', 'logout',
    'validate', 'serialize', 'deserialize',
    'create', 'read', 'update', 'delete',
    'get', 'set', 'post', 'put', 'patch',
    'connect', 'disconnect', 'send', 'receive',
    'parse', 'format', 'convert', 'transform',
    'load', 'save', 'export', 'import_',
    'init', 'setup', 'configure', 'initialize',
}


class FunctionFilter:
    """Filter functions to keep only high-quality, searchable ones."""

    def __init__(
        self,
        include_private: bool = False,
        include_dunders: bool = True,
        max_name_length: int = 50,
    ):
        self.include_private = include_private
        self.include_dunders = include_dunders
        self.max_name_length = max_name_length

    def filter_functions(self, functions: List[ExtractedFunction]) -> List[ExtractedFunction]:
        original = len(functions)
        filtered = [f for f in functions if self._keep(f)]
        
        if original - len(filtered) > 0:
            logger.debug("Filtered functions", kept=len(filtered), removed=original - len(filtered))
        
        return filtered

    def _keep(self, func: ExtractedFunction) -> bool:
        name = func.name.lower()
        path = func.file_path.lower()

        # always keep public API
        if any(api in name for api in PUBLIC_API):
            return True

        # skip junk paths
        if any(p in path for p in JUNK_PATHS):
            return False

        # skip junk prefixes
        if name.startswith(JUNK_PREFIXES):
            return False

        # skip junk patterns
        if any(p in name for p in JUNK_PATTERNS):
            return False

        # skip long auto-generated names
        if len(name) > self.max_name_length:
            return False

        # handle private functions
        if func.name.startswith('_') and not func.name.startswith('__'):
            return self.include_private

        # handle dunders
        if func.name.startswith('__') and func.name.endswith('__'):
            return self.include_dunders

        # skip test data generators
        if name.startswith('make_') and ('test' in path or 'random' in name):
            return False

        return True

    def get_stats(self, functions: List[ExtractedFunction]) -> dict:
        quality = [f for f in functions if self._keep(f)]
        return {
            "total": len(functions),
            "kept": len(quality),
            "removed": len(functions) - len(quality),
        }


default_filter = FunctionFilter()


def filter_functions(functions: List[ExtractedFunction]) -> List[ExtractedFunction]:
    """Filter using default settings."""
    return default_filter.filter_functions(functions)
