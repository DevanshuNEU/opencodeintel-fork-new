"""
CodeDNA Extractor
Extracts architectural patterns, conventions, and constraints from a codebase.
Generates a DNA document that helps AI understand how to write consistent code.
"""
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from collections import defaultdict, Counter
from dataclasses import dataclass, field, asdict
import re
import json

import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
from tree_sitter import Language, Parser

from services.observability import logger
from services.supabase_service import get_supabase_service


@dataclass
class AuthPattern:
    """Detected authentication patterns"""
    middleware_used: List[str] = field(default_factory=list)
    auth_decorators: List[str] = field(default_factory=list)
    ownership_checks: List[str] = field(default_factory=list)
    auth_context_type: Optional[str] = None


@dataclass
class ServicePattern:
    """Detected service layer patterns"""
    singleton_services: List[str] = field(default_factory=list)
    dependencies_file: Optional[str] = None
    service_base_classes: List[str] = field(default_factory=list)
    injection_pattern: Optional[str] = None


@dataclass 
class DatabasePattern:
    """Detected database patterns"""
    orm_used: Optional[str] = None
    connection_pattern: Optional[str] = None
    has_rls: bool = False
    id_type: str = "unknown"
    timestamp_type: str = "unknown"
    cascade_deletes: bool = False


@dataclass
class ErrorPattern:
    """Detected error handling patterns"""
    exception_classes: List[str] = field(default_factory=list)
    http_exception_usage: bool = False
    error_response_format: Optional[str] = None
    logging_on_error: bool = False


@dataclass
class LoggingPattern:
    """Detected logging patterns"""
    logger_import: Optional[str] = None
    log_levels_used: List[str] = field(default_factory=list)
    structured_logging: bool = False
    metrics_tracking: bool = False


@dataclass
class NamingConventions:
    """Detected naming conventions"""
    function_style: str = "unknown"
    class_style: str = "unknown"
    constant_style: str = "unknown"
    file_style: str = "unknown"


@dataclass
class CodebaseDNA:
    """Complete DNA profile of a codebase"""
    repo_id: str
    detected_framework: Optional[str] = None
    language_distribution: Dict[str, int] = field(default_factory=dict)
    auth_patterns: AuthPattern = field(default_factory=AuthPattern)
    service_patterns: ServicePattern = field(default_factory=ServicePattern)
    database_patterns: DatabasePattern = field(default_factory=DatabasePattern)
    error_patterns: ErrorPattern = field(default_factory=ErrorPattern)
    logging_patterns: LoggingPattern = field(default_factory=LoggingPattern)
    naming_conventions: NamingConventions = field(default_factory=NamingConventions)
    middleware_patterns: List[str] = field(default_factory=list)
    common_imports: List[str] = field(default_factory=list)
    skip_directories: List[str] = field(default_factory=list)
    api_versioning: Optional[str] = None
    router_pattern: Optional[str] = None
    test_patterns: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    def to_markdown(self) -> str:
        """Generate markdown DNA document for AI consumption"""
        md = f"# Codebase DNA\n\n"
        
        # Framework detection
        if self.detected_framework:
            md += f"**Detected Framework:** {self.detected_framework}\n\n"
        
        # Language distribution
        md += "## Language Distribution\n"
        for lang, count in sorted(self.language_distribution.items(), key=lambda x: -x[1]):
            md += f"- {lang}: {count} files\n"
        md += "\n"
        
        # Middleware patterns
        if self.middleware_patterns:
            md += "## Middleware Patterns\n"
            for mw in self.middleware_patterns:
                md += f"- `{mw}`\n"
            md += "\n"
        
        # Auth patterns
        md += "## Authentication Patterns\n"
        if self.auth_patterns.middleware_used:
            md += f"**Middleware:** `{', '.join(self.auth_patterns.middleware_used)}`\n"
        if self.auth_patterns.auth_decorators:
            md += f"**Decorators:** `{', '.join(self.auth_patterns.auth_decorators)}`\n"
        if self.auth_patterns.ownership_checks:
            md += f"**Ownership Checks:** `{', '.join(self.auth_patterns.ownership_checks)}`\n"
        if self.auth_patterns.auth_context_type:
            md += f"**Auth Context:** `{self.auth_patterns.auth_context_type}`\n"
        md += "\n"
        
        # Service patterns
        md += "## Service Layer Patterns\n"
        if self.service_patterns.singleton_services:
            md += f"**Singletons:** `{', '.join(self.service_patterns.singleton_services)}`\n"
        if self.service_patterns.dependencies_file:
            md += f"**Dependencies File:** `{self.service_patterns.dependencies_file}`\n"
        if self.service_patterns.injection_pattern:
            md += f"**Injection Pattern:** {self.service_patterns.injection_pattern}\n"
        md += "\n"
        
        # Database patterns
        md += "## Database Patterns\n"
        if self.database_patterns.orm_used:
            md += f"**ORM:** {self.database_patterns.orm_used}\n"
        md += f"**ID Type:** `{self.database_patterns.id_type}`\n"
        md += f"**Timestamp Type:** `{self.database_patterns.timestamp_type}`\n"
        md += f"**RLS Enabled:** {self.database_patterns.has_rls}\n"
        md += f"**Cascade Deletes:** {self.database_patterns.cascade_deletes}\n"
        md += "\n"
        
        # Error handling
        md += "## Error Handling\n"
        if self.error_patterns.exception_classes:
            md += f"**Exception Classes:** `{', '.join(self.error_patterns.exception_classes)}`\n"
        md += f"**HTTP Exception:** {self.error_patterns.http_exception_usage}\n"
        md += f"**Logs Errors:** {self.error_patterns.logging_on_error}\n"
        md += "\n"
        
        # Logging
        md += "## Logging Patterns\n"
        if self.logging_patterns.logger_import:
            md += f"**Import:** `{self.logging_patterns.logger_import}`\n"
        if self.logging_patterns.log_levels_used:
            md += f"**Levels Used:** `{', '.join(self.logging_patterns.log_levels_used)}`\n"
        md += f"**Structured:** {self.logging_patterns.structured_logging}\n"
        md += f"**Metrics:** {self.logging_patterns.metrics_tracking}\n"
        md += "\n"
        
        # Naming
        md += "## Naming Conventions\n"
        md += f"- Functions: `{self.naming_conventions.function_style}`\n"
        md += f"- Classes: `{self.naming_conventions.class_style}`\n"
        md += f"- Constants: `{self.naming_conventions.constant_style}`\n"
        md += f"- Files: `{self.naming_conventions.file_style}`\n"
        md += "\n"
        
        # Common imports
        if self.common_imports:
            md += "## Common Imports\n"
            md += "```python\n"
            for imp in self.common_imports[:15]:
                md += f"{imp}\n"
            md += "```\n\n"
        
        # API patterns
        if self.api_versioning or self.router_pattern:
            md += "## API Patterns\n"
            if self.api_versioning:
                md += f"**Versioning:** `{self.api_versioning}`\n"
            if self.router_pattern:
                md += f"**Router:** `{self.router_pattern}`\n"
            md += "\n"
        
        # Skip directories
        if self.skip_directories:
            md += "## Skip Directories\n"
            md += f"`{', '.join(self.skip_directories)}`\n\n"
        
        return md


class DNAExtractor:
    """Extracts architectural DNA from a codebase"""
    
    SKIP_DIRS = {'node_modules', '.git', '__pycache__', 'venv', 'env', 'dist', 'build', '.next', 'coverage'}
    
    def __init__(self):
        self.parsers = {
            'python': Parser(Language(tspython.language())),
            'javascript': Parser(Language(tsjavascript.language())),
            'typescript': Parser(Language(tsjavascript.language())),
        }
        self._supabase = None
        logger.info("DNAExtractor initialized")
    
    @property
    def supabase(self):
        if self._supabase is None:
            self._supabase = get_supabase_service()
        return self._supabase
    
    def _detect_language(self, file_path: str) -> str:
        ext = Path(file_path).suffix.lower()
        return {
            '.py': 'python',
            '.js': 'javascript', 
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
        }.get(ext, 'unknown')
    
    def _discover_files(self, repo_path: Path) -> List[Path]:
        """Find all code files, skipping irrelevant directories"""
        files = []
        extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.sql'}
        
        for item in repo_path.rglob('*'):
            if item.is_file() and item.suffix in extensions:
                if not any(skip in item.parts for skip in self.SKIP_DIRS):
                    files.append(item)
        
        return files

    def _detect_framework(self, files: List[Path]) -> Optional[str]:
        """Detect the primary framework used in the codebase"""
        framework_indicators = {
            'fastapi': ['from fastapi', 'FastAPI()', 'APIRouter'],
            'starlette': ['from starlette', 'Starlette()', 'starlette.routing'],
            'flask': ['from flask', 'Flask(__name__)', '@app.route'],
            'django': ['from django', 'django.conf', 'INSTALLED_APPS'],
            'express': ['require("express")', 'express()', 'app.use('],
            'nextjs': ['from next', 'getServerSideProps', 'getStaticProps'],
            'nestjs': ['@Module(', '@Injectable(', '@Controller('],
        }
        
        scores = Counter()
        for file_path in files:
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                for framework, indicators in framework_indicators.items():
                    for indicator in indicators:
                        if indicator in content:
                            scores[framework] += 1
            except:
                pass
        
        if scores:
            return scores.most_common(1)[0][0]
        return None

    def _extract_middleware_patterns(self, files: List[Path], framework: Optional[str]) -> List[str]:
        """Extract middleware patterns based on framework"""
        patterns = []
        
        for file_path in files:
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # Starlette/ASGI middleware
                if 'class' in content and 'Middleware' in content:
                    middlewares = re.findall(r'class\s+(\w*Middleware\w*)', content)
                    patterns.extend(middlewares)
                if 'Middleware(' in content:
                    patterns.append('Middleware(cls)')
                if 'app.add_middleware' in content:
                    patterns.append('app.add_middleware()')
                
                # FastAPI Depends
                if 'Depends(' in content:
                    deps = re.findall(r'Depends\((\w+)\)', content)
                    for dep in deps:
                        patterns.append(f'Depends({dep})')
                
                # Express middleware
                if 'app.use(' in content:
                    patterns.append('app.use(middleware)')
                
                # Flask decorators
                if '@app.before_request' in content:
                    patterns.append('@app.before_request')
                    
            except:
                pass
        
        return list(set(patterns))

    def _extract_auth_patterns(self, files: List[Path], repo_path: Path, framework: Optional[str] = None) -> AuthPattern:
        """Extract authentication patterns from codebase"""
        pattern = AuthPattern()
        
        for file_path in files:
            if file_path.suffix != '.py':
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # FastAPI patterns
                if 'require_auth' in content:
                    pattern.middleware_used.append('require_auth')
                if 'public_auth' in content:
                    pattern.middleware_used.append('public_auth')
                if 'Depends(' in content and 'auth' in content.lower():
                    pattern.auth_decorators.append('Depends(require_auth)')
                
                # Starlette patterns
                if 'AuthenticationMiddleware' in content:
                    pattern.middleware_used.append('AuthenticationMiddleware')
                if 'AuthCredentials' in content:
                    pattern.auth_context_type = 'AuthCredentials'
                if 'AuthenticationBackend' in content:
                    pattern.middleware_used.append('AuthenticationBackend')
                if 'requires(' in content:
                    scopes = re.findall(r'requires\([\'"](\w+)[\'"]\)', content)
                    for scope in scopes:
                        pattern.auth_decorators.append(f'@requires("{scope}")')
                
                # Flask patterns
                if 'login_required' in content:
                    pattern.auth_decorators.append('@login_required')
                if 'flask_login' in content:
                    pattern.middleware_used.append('flask_login')
                if 'current_user' in content:
                    pattern.auth_context_type = 'current_user'
                
                # Django patterns
                if '@login_required' in content:
                    pattern.auth_decorators.append('@login_required')
                if 'permission_required' in content:
                    pattern.auth_decorators.append('@permission_required')
                if 'request.user' in content:
                    pattern.auth_context_type = 'request.user'
                
                # Detect ownership checks
                if 'get_repo_or_404' in content:
                    pattern.ownership_checks.append('get_repo_or_404(repo_id, auth.user_id)')
                if 'verify_ownership' in content:
                    pattern.ownership_checks.append('verify_ownership')
                if 'user_id' in content and ('==' in content or '.filter(' in content):
                    pattern.ownership_checks.append('user_id check')
                
                # Detect AuthContext
                if 'AuthContext' in content:
                    pattern.auth_context_type = 'AuthContext'
                    
            except Exception as e:
                logger.debug(f"Error reading {file_path}: {e}")
        
        pattern.middleware_used = list(set(pattern.middleware_used))
        pattern.ownership_checks = list(set(pattern.ownership_checks))
        return pattern
    
    def _extract_service_patterns(self, files: List[Path], repo_path: Path) -> ServicePattern:
        """Extract service layer patterns"""
        pattern = ServicePattern()
        
        # Check for dependencies.py
        deps_file = repo_path / 'dependencies.py'
        if deps_file.exists():
            pattern.dependencies_file = 'dependencies.py'
            try:
                content = deps_file.read_text(encoding='utf-8', errors='ignore')
                
                # Find singleton instantiations
                singleton_pattern = re.findall(r'^(\w+)\s*=\s*(\w+)\(\)', content, re.MULTILINE)
                for var_name, class_name in singleton_pattern:
                    pattern.singleton_services.append(f"{var_name} = {class_name}()")
                
                pattern.injection_pattern = "Singleton in dependencies.py"
            except Exception as e:
                logger.debug(f"Error reading dependencies.py: {e}")
        
        # Check services directory structure
        services_dir = repo_path / 'services'
        if services_dir.exists():
            for service_file in services_dir.glob('*.py'):
                if service_file.name.startswith('_'):
                    continue
                try:
                    content = service_file.read_text(encoding='utf-8', errors='ignore')
                    classes = re.findall(r'^class\s+(\w+)', content, re.MULTILINE)
                    pattern.service_base_classes.extend(classes)
                except:
                    pass
        
        return pattern
    
    def _extract_database_patterns(self, files: List[Path], repo_path: Path) -> DatabasePattern:
        """Extract database patterns from migrations and code"""
        pattern = DatabasePattern()
        
        for file_path in files:
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # Check for Supabase
                if 'supabase' in content.lower():
                    pattern.orm_used = 'Supabase'
                    
                # Check SQL files for patterns
                if file_path.suffix == '.sql':
                    if 'gen_random_uuid()' in content:
                        pattern.id_type = 'UUID (gen_random_uuid())'
                    elif 'SERIAL' in content:
                        pattern.id_type = 'SERIAL'
                    
                    if 'TIMESTAMPTZ' in content:
                        pattern.timestamp_type = 'TIMESTAMPTZ'
                    elif 'TIMESTAMP' in content:
                        pattern.timestamp_type = 'TIMESTAMP'
                    
                    if 'ENABLE ROW LEVEL SECURITY' in content:
                        pattern.has_rls = True
                    
                    if 'ON DELETE CASCADE' in content:
                        pattern.cascade_deletes = True
                
                # Check Python for connection patterns
                if file_path.suffix == '.py':
                    if 'get_supabase_service()' in content:
                        pattern.connection_pattern = 'Singleton: get_supabase_service()'
                    elif 'create_client(' in content:
                        pattern.connection_pattern = 'Direct: create_client()'
                        
            except Exception as e:
                logger.debug(f"Error reading {file_path}: {e}")
        
        return pattern
    
    def _extract_error_patterns(self, files: List[Path]) -> ErrorPattern:
        """Extract error handling patterns"""
        pattern = ErrorPattern()
        
        for file_path in files:
            if file_path.suffix != '.py':
                continue
            
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                if 'HTTPException' in content:
                    pattern.http_exception_usage = True
                    
                if 'logger.error' in content and ('except' in content or 'Exception' in content):
                    pattern.logging_on_error = True
                
                # Find custom exception classes
                custom_exceptions = re.findall(r'class\s+(\w*(?:Error|Exception)\w*)', content)
                pattern.exception_classes.extend(custom_exceptions)
                
            except Exception as e:
                logger.debug(f"Error reading {file_path}: {e}")
        
        pattern.exception_classes = list(set(pattern.exception_classes))
        return pattern
    
    def _extract_logging_patterns(self, files: List[Path]) -> LoggingPattern:
        """Extract logging patterns"""
        pattern = LoggingPattern()
        log_levels = set()
        
        for file_path in files:
            if file_path.suffix != '.py':
                continue
            
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # Detect logger import
                if 'from services.observability import logger' in content:
                    pattern.logger_import = 'from services.observability import logger'
                    pattern.structured_logging = True
                elif 'import logging' in content:
                    pattern.logger_import = 'import logging'
                
                # Detect log levels
                for level in ['debug', 'info', 'warning', 'error', 'critical']:
                    if f'logger.{level}' in content:
                        log_levels.add(level)
                
                # Detect metrics
                if 'metrics.increment' in content or 'metrics.gauge' in content:
                    pattern.metrics_tracking = True
                    
            except Exception as e:
                logger.debug(f"Error reading {file_path}: {e}")
        
        pattern.log_levels_used = list(log_levels)
        return pattern
    
    def _extract_naming_conventions(self, files: List[Path]) -> NamingConventions:
        """Extract naming conventions from code"""
        conventions = NamingConventions()
        
        function_styles = Counter()
        class_styles = Counter()
        
        for file_path in files:
            if file_path.suffix != '.py':
                continue
            
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # Extract function names
                functions = re.findall(r'def\s+(\w+)\s*\(', content)
                for func in functions:
                    if func.startswith('_'):
                        continue
                    if '_' in func:
                        function_styles['snake_case'] += 1
                    elif func[0].islower() and any(c.isupper() for c in func):
                        function_styles['camelCase'] += 1
                
                # Extract class names
                classes = re.findall(r'class\s+(\w+)', content)
                for cls in classes:
                    if cls[0].isupper() and '_' not in cls:
                        class_styles['PascalCase'] += 1
                        
            except:
                pass
        
        # File naming
        py_files = [f for f in files if f.suffix == '.py']
        snake_files = sum(1 for f in py_files if '_' in f.stem and f.stem.islower())
        if snake_files > len(py_files) * 0.5:
            conventions.file_style = 'snake_case'
        
        if function_styles:
            conventions.function_style = function_styles.most_common(1)[0][0]
        if class_styles:
            conventions.class_style = class_styles.most_common(1)[0][0]
        
        conventions.constant_style = 'UPPER_SNAKE_CASE'
        
        return conventions
    
    def _extract_common_imports(self, files: List[Path]) -> List[str]:
        """Extract most common import patterns"""
        import_counter = Counter()
        
        for file_path in files:
            if file_path.suffix != '.py':
                continue
            
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # Find all imports
                imports = re.findall(r'^(?:from\s+[\w.]+\s+)?import\s+.+$', content, re.MULTILINE)
                for imp in imports:
                    imp = imp.strip()
                    if imp and not imp.startswith('#'):
                        import_counter[imp] += 1
                        
            except:
                pass
        
        # Return most common imports
        return [imp for imp, count in import_counter.most_common(20) if count >= 2]
    
    def _extract_api_patterns(self, files: List[Path], repo_path: Path) -> tuple:
        """Extract API versioning and router patterns"""
        api_versioning = None
        router_pattern = None
        
        # Check config for API versioning
        config_file = repo_path / 'config' / 'api.py'
        if config_file.exists():
            try:
                content = config_file.read_text(encoding='utf-8', errors='ignore')
                if 'API_PREFIX' in content or 'API_VERSION' in content:
                    api_versioning = '/api/v1 (from config/api.py)'
            except:
                pass
        
        # Check for router patterns in routes
        routes_dir = repo_path / 'routes'
        if routes_dir.exists():
            for route_file in routes_dir.glob('*.py'):
                try:
                    content = route_file.read_text(encoding='utf-8', errors='ignore')
                    if 'APIRouter(' in content:
                        match = re.search(r'APIRouter\(prefix=["\']([^"\']+)["\']', content)
                        if match:
                            router_pattern = f'APIRouter(prefix="{match.group(1)}", tags=[...])'
                            break
                except:
                    pass
        
        return api_versioning, router_pattern

    def extract_dna(self, repo_path: str, repo_id: str) -> CodebaseDNA:
        """Extract complete DNA profile from a codebase"""
        repo_path = Path(repo_path)
        
        logger.info("Extracting codebase DNA", repo_id=repo_id, path=str(repo_path))
        
        # Discover files
        files = self._discover_files(repo_path)
        logger.info(f"Found {len(files)} code files")
        
        # Detect framework first
        detected_framework = self._detect_framework(files)
        logger.info(f"Detected framework: {detected_framework}")
        
        # Language distribution
        lang_dist = Counter()
        for f in files:
            lang = self._detect_language(str(f))
            if lang != 'unknown':
                lang_dist[lang] += 1
        
        # Extract all patterns (pass framework where needed)
        auth_patterns = self._extract_auth_patterns(files, repo_path, detected_framework)
        middleware_patterns = self._extract_middleware_patterns(files, detected_framework)
        service_patterns = self._extract_service_patterns(files, repo_path)
        database_patterns = self._extract_database_patterns(files, repo_path)
        error_patterns = self._extract_error_patterns(files)
        logging_patterns = self._extract_logging_patterns(files)
        naming_conventions = self._extract_naming_conventions(files)
        common_imports = self._extract_common_imports(files)
        api_versioning, router_pattern = self._extract_api_patterns(files, repo_path)
        
        dna = CodebaseDNA(
            repo_id=repo_id,
            detected_framework=detected_framework,
            language_distribution=dict(lang_dist),
            auth_patterns=auth_patterns,
            service_patterns=service_patterns,
            database_patterns=database_patterns,
            error_patterns=error_patterns,
            logging_patterns=logging_patterns,
            naming_conventions=naming_conventions,
            middleware_patterns=middleware_patterns,
            common_imports=common_imports,
            skip_directories=list(self.SKIP_DIRS),
            api_versioning=api_versioning,
            router_pattern=router_pattern,
        )
        
        logger.info("DNA extraction complete", repo_id=repo_id)
        return dna
    
    def save_to_cache(self, repo_id: str, dna: CodebaseDNA) -> bool:
        """Save DNA to database cache using architecture_patterns column"""
        try:
            # Store DNA in the architecture_patterns JSONB column
            dna_data = {'codebase_dna': dna.to_dict()}
            
            self.supabase.client.table('repository_insights').upsert(
                {
                    'repo_id': repo_id,
                    'architecture_patterns': dna_data,
                },
                on_conflict='repo_id'
            ).execute()
            
            logger.info("DNA saved to cache", repo_id=repo_id)
            return True
        except Exception as e:
            logger.error("Failed to save DNA to cache", error=str(e))
            return False
    
    def load_from_cache(self, repo_id: str) -> Optional[CodebaseDNA]:
        """Load DNA from database cache"""
        try:
            result = self.supabase.client.table('repository_insights').select(
                'architecture_patterns'
            ).eq('repo_id', repo_id).execute()
            
            if result.data and result.data[0].get('architecture_patterns'):
                arch_patterns = result.data[0]['architecture_patterns']
                data = arch_patterns.get('codebase_dna')
                
                if not data:
                    return None
                
                # Reconstruct CodebaseDNA from dict
                dna = CodebaseDNA(
                    repo_id=data['repo_id'],
                    language_distribution=data.get('language_distribution', {}),
                    auth_patterns=AuthPattern(**data.get('auth_patterns', {})),
                    service_patterns=ServicePattern(**data.get('service_patterns', {})),
                    database_patterns=DatabasePattern(**data.get('database_patterns', {})),
                    error_patterns=ErrorPattern(**data.get('error_patterns', {})),
                    logging_patterns=LoggingPattern(**data.get('logging_patterns', {})),
                    naming_conventions=NamingConventions(**data.get('naming_conventions', {})),
                    common_imports=data.get('common_imports', []),
                    skip_directories=data.get('skip_directories', []),
                    api_versioning=data.get('api_versioning'),
                    router_pattern=data.get('router_pattern'),
                )
                logger.debug("DNA loaded from cache", repo_id=repo_id)
                return dna
        except Exception as e:
            logger.debug(f"No cached DNA found: {e}")
        
        return None
