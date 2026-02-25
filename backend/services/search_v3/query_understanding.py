"""
Query Understanding - Intent classification and query expansion
Determines WHAT the user wants and HOW to search for it
"""
import re
from enum import Enum
from typing import List, Tuple
from dataclasses import dataclass

from services.observability import logger


class QueryIntent(Enum):
    """Types of search intents"""
    FIND_IMPLEMENTATION = "find"      # "where is auth handled", "find login"
    EXPLAIN_CODE = "explain"          # "how does X work", "explain Y"
    FIND_USAGE = "usage"              # "how to use X", "examples of Y"
    FIND_DEFINITION = "definition"    # "what is X", "define Y"
    DEBUG = "debug"                   # "why is X failing", "fix bug in Y"


@dataclass
class QueryAnalysis:
    """Result of query analysis"""
    original_query: str
    intent: QueryIntent
    expanded_query: str
    keywords: List[str]
    code_terms: List[str]  # specific code-related terms
    should_include_tests: bool
    confidence: float


class QueryUnderstanding:
    """
    Analyzes user queries to understand intent and expand for better search
    """
    
    # patterns that suggest specific intents
    INTENT_PATTERNS = {
        QueryIntent.EXPLAIN_CODE: [
            r'\bhow\s+(does|do|is|are)\b',
            r'\bexplain\b',
            r'\bwhat\s+(does|is|are)\b',
            r'\bunderstand\b',
            r'\bdescribe\b',
        ],
        QueryIntent.FIND_USAGE: [
            r'\bhow\s+to\b',
            r'\bexample[s]?\b',
            r'\buse\s+case\b',
            r'\busage\b',
            r'\bdemonstrat',
        ],
        QueryIntent.FIND_DEFINITION: [
            r'\bdefin(e|ition)\b',
            r'\bwhat\s+is\b',
            r'^where\s+is\b',
            r'\bclass\s+for\b',
            r'\bfunction\s+for\b',
        ],
        QueryIntent.DEBUG: [
            r'\bfix\b',
            r'\bbug\b',
            r'\berror\b',
            r'\bfail',
            r'\bwhy\s+(is|does|do)\b',
            r'\bnot\s+working\b',
            r'\bissue\b',
        ],
    }
    
    # code-related synonyms for query expansion
    CODE_SYNONYMS = {
        # auth related
        'auth': ['authentication', 'authorize', 'login', 'credential', 'token', 'session'],
        'authentication': ['auth', 'login', 'credential', 'authenticate'],
        'login': ['auth', 'authenticate', 'sign_in', 'signin'],
        
        # data related
        'json': ['JSONResponse', 'json_response', 'application/json', 'serialize', 'dump'],
        'response': ['Response', 'JSONResponse', 'HTMLResponse', 'return'],
        'request': ['Request', 'http_request', 'incoming'],
        
        # error handling
        'error': ['exception', 'error_handler', 'catch', 'raise', 'throw'],
        'exception': ['error', 'raise', 'catch', 'try', 'except'],
        'handle': ['handler', 'process', 'manage', 'catch'],
        
        # web related
        'websocket': ['WebSocket', 'ws', 'socket', 'realtime'],
        'middleware': ['Middleware', 'dispatch', 'before_request', 'after_request'],
        'route': ['router', 'endpoint', 'path', 'url', 'decorator'],
        'endpoint': ['route', 'path', 'api', 'handler'],
        
        # database
        'database': ['db', 'query', 'sql', 'orm', 'model'],
        'query': ['select', 'find', 'filter', 'where'],
        
        # validation
        'validate': ['validation', 'validator', 'check', 'verify', 'sanitize'],
        'validation': ['validate', 'validator', 'schema', 'pydantic'],
        
        # general patterns
        'create': ['new', 'init', 'constructor', 'build', 'make'],
        'delete': ['remove', 'destroy', 'drop', 'clear'],
        'update': ['modify', 'change', 'edit', 'patch', 'put'],
        'get': ['fetch', 'retrieve', 'find', 'load', 'read'],
    }
    
    # terms that suggest test files should be included
    TEST_INCLUDE_TERMS = ['test', 'testing', 'spec', 'mock', 'fixture', 'example']
    
    def __init__(self):
        logger.info("QueryUnderstanding initialized")
    
    def analyze(self, query: str) -> QueryAnalysis:
        """
        Analyze a user query to understand intent and expand it
        """
        query_lower = query.lower().strip()
        
        # detect intent
        intent, confidence = self._detect_intent(query_lower)
        
        # extract keywords
        keywords = self._extract_keywords(query_lower)
        
        # find code-specific terms (use original query to preserve CamelCase)
        code_terms = self._extract_code_terms(query)
        
        # expand query with synonyms
        expanded = self._expand_query(query_lower, code_terms)
        
        # determine if tests should be included
        include_tests = self._should_include_tests(query_lower)
        
        analysis = QueryAnalysis(
            original_query=query,
            intent=intent,
            expanded_query=expanded,
            keywords=keywords,
            code_terms=code_terms,
            should_include_tests=include_tests,
            confidence=confidence
        )
        
        logger.debug("Query analyzed", 
                    intent=intent.value, 
                    expanded=expanded[:100],
                    keywords=keywords,
                    include_tests=include_tests)
        
        return analysis
    
    def _detect_intent(self, query: str) -> Tuple[QueryIntent, float]:
        """Detect the primary intent of the query"""
        scores = {}
        
        for intent, patterns in self.INTENT_PATTERNS.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, query, re.IGNORECASE):
                    score += 1
            scores[intent] = score
        
        # find highest scoring intent
        if scores:
            best_intent = max(scores, key=scores.get)
            if scores[best_intent] > 0:
                confidence = min(1.0, scores[best_intent] / 2)  # normalize
                return best_intent, confidence
        
        # default to FIND_IMPLEMENTATION
        return QueryIntent.FIND_IMPLEMENTATION, 0.5
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Extract meaningful keywords from query"""
        # remove common words
        stop_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'how', 'what', 'where', 'when', 'why', 'which', 'who',
            'do', 'does', 'did', 'doing', 'done',
            'to', 'for', 'from', 'in', 'on', 'at', 'by', 'with',
            'this', 'that', 'these', 'those', 'it', 'its',
            'can', 'could', 'would', 'should', 'will', 'might',
            'and', 'or', 'but', 'if', 'then', 'else',
            'i', 'me', 'my', 'we', 'our', 'you', 'your',
            'find', 'show', 'get', 'give', 'tell', 'explain',
        }
        
        # tokenize
        words = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', query.lower())
        
        # filter
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
        return keywords
    
    def _extract_code_terms(self, query: str) -> List[str]:
        """Extract code-specific terms that might be function/class names"""
        code_terms = []
        
        # CamelCase or snake_case patterns
        camel_case = re.findall(r'\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b', query)
        snake_case = re.findall(r'\b[a-z]+(?:_[a-z]+)+\b', query)
        
        code_terms.extend(camel_case)
        code_terms.extend(snake_case)
        
        # also look for known code terms from synonyms
        for term in self.CODE_SYNONYMS.keys():
            if term.lower() in query:
                code_terms.append(term)
        
        return list(set(code_terms))
    
    def _expand_query(self, query: str, code_terms: List[str]) -> str:
        """Expand query with synonyms for better recall"""
        expanded_parts = [query]
        
        # add synonyms for code terms
        for term in code_terms:
            term_lower = term.lower()
            if term_lower in self.CODE_SYNONYMS:
                synonyms = self.CODE_SYNONYMS[term_lower]
                # add top 3 synonyms
                expanded_parts.extend(synonyms[:3])
        
        # also check keywords in the query
        words = query.lower().split()
        for word in words:
            if word in self.CODE_SYNONYMS:
                synonyms = self.CODE_SYNONYMS[word]
                expanded_parts.extend(synonyms[:2])
        
        # deduplicate while preserving order
        seen = set()
        unique_parts = []
        for part in expanded_parts:
            if part.lower() not in seen:
                seen.add(part.lower())
                unique_parts.append(part)
        
        return ' '.join(unique_parts)
    
    def _should_include_tests(self, query: str) -> bool:
        """Determine if test files should be included in results"""
        query_lower = query.lower()
        
        for term in self.TEST_INCLUDE_TERMS:
            if term in query_lower:
                return True
        
        return False
