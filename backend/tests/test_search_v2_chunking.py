"""Tests for Search V2 function-level chunking."""
import pytest
from services.search_v2 import (
    TreeSitterExtractor,
    FunctionFilter,
    ExtractedFunction,
    filter_functions,
)


class TestTreeSitterExtractor:

    @pytest.fixture
    def extractor(self):
        return TreeSitterExtractor()

    def test_python_function(self, extractor):
        code = '''
def hello_world(name: str) -> str:
    """Say hello to someone."""
    return f"Hello, {name}!"
'''
        funcs = extractor.extract_from_code(code, 'python', 'test.py')

        assert len(funcs) == 1
        assert funcs[0].name == "hello_world"
        assert funcs[0].docstring == "Say hello to someone."

    def test_python_class_method(self, extractor):
        code = '''
class UserService:
    def get_user(self, user_id: int) -> dict:
        """Fetch a user by ID."""
        return {"id": user_id}

    async def create_user(self, data: dict) -> dict:
        """Create a new user."""
        return data
'''
        funcs = extractor.extract_from_code(code, 'python', 'services/user.py')

        assert len(funcs) == 2

        get_user = next(f for f in funcs if f.name == "get_user")
        assert get_user.qualified_name == "UserService.get_user"
        assert get_user.class_name == "UserService"
        assert get_user.is_method is True

        create_user = next(f for f in funcs if f.name == "create_user")
        assert create_user.is_async is True

    def test_skip_private(self, extractor):
        code = '''
def public_func():
    pass

def _private_func():
    pass

def __dunder_func__():
    pass
'''
        funcs = extractor.extract_from_code(code, 'python', 'test.py')
        names = [f.name for f in funcs]

        assert "public_func" in names
        assert "_private_func" not in names
        assert "__dunder_func__" in names

    def test_javascript_functions(self, extractor):
        code = '''
function fetchData(url) {
    return fetch(url);
}

const processData = async (data) => {
    return data.map(x => x * 2);
};
'''
        funcs = extractor.extract_from_code(code, 'javascript', 'utils.js')
        names = [f.name for f in funcs]

        assert "fetchData" in names
        assert "processData" in names

    def test_typescript_class(self, extractor):
        code = '''
class ApiClient {
    async get(endpoint: string): Promise<Response> {
        return fetch(endpoint);
    }

    post(endpoint: string, data: object): Promise<Response> {
        return fetch(endpoint, { method: 'POST' });
    }
}
'''
        funcs = extractor.extract_from_code(code, 'typescript', 'api.ts')

        assert len(funcs) == 2
        get_method = next(f for f in funcs if f.name == "get")
        assert get_method.qualified_name == "ApiClient.get"
        assert get_method.is_async is True


class TestFunctionFilter:

    @pytest.fixture
    def fltr(self):
        return FunctionFilter()

    def _make_func(self, name, file_path="src/module.py"):
        return ExtractedFunction(
            name=name,
            qualified_name=name,
            file_path=file_path,
            code=f"def {name}(): pass",
            signature=f"def {name}():",
            language="python",
            start_line=1,
            end_line=2,
        )

    def test_filter_test_functions(self, fltr):
        funcs = [
            self._make_func("test_something"),
            self._make_func("mock_database"),
            self._make_func("real_function"),
        ]

        filtered = fltr.filter_functions(funcs)
        names = [f.name for f in filtered]

        assert "real_function" in names
        assert "test_something" not in names
        assert "mock_database" not in names

    def test_filter_test_directories(self, fltr):
        funcs = [
            self._make_func("helper", "tests/test_utils.py"),
            self._make_func("real_helper", "src/utils.py"),
        ]

        filtered = fltr.filter_functions(funcs)

        assert len(filtered) == 1
        assert filtered[0].name == "real_helper"

    def test_keep_public_api(self, fltr):
        funcs = [
            self._make_func("read_csv"),
            self._make_func("validate"),
            self._make_func("authenticate"),
        ]

        filtered = fltr.filter_functions(funcs)
        assert len(filtered) == 3

    def test_filter_long_names(self, fltr):
        long_name = "this_is_an_extremely_long_auto_generated_function_name_that_should_be_filtered"
        funcs = [
            self._make_func(long_name),
            self._make_func("short_name"),
        ]

        filtered = fltr.filter_functions(funcs)
        names = [f.name for f in filtered]

        assert "short_name" in names
        assert long_name not in names

    def test_get_stats(self, fltr):
        funcs = [
            self._make_func("test_func"),
            self._make_func("real_func"),
            self._make_func("_private"),
            self._make_func("helper", "tests/helpers.py"),
        ]

        stats = fltr.get_stats(funcs)

        assert stats["total"] == 4
        assert stats["kept"] == 1
        assert stats["removed"] == 3


class TestExtractedFunction:

    def test_display_name_simple(self):
        func = ExtractedFunction(
            name="my_func", qualified_name="my_func", file_path="test.py",
            code="def my_func(): pass", signature="def my_func():",
            language="python", start_line=1, end_line=2,
        )
        assert func.display_name == "my_func"

    def test_display_name_method(self):
        func = ExtractedFunction(
            name="get", qualified_name="Session.get", file_path="session.py",
            code="def get(self): pass", signature="def get(self):",
            language="python", start_line=1, end_line=2, class_name="Session",
        )
        assert func.display_name == "Session.get"

    def test_id_string(self):
        func = ExtractedFunction(
            name="process", qualified_name="DataHandler.process",
            file_path="handlers/data.py", code="def process(): pass",
            signature="def process():", language="python",
            start_line=42, end_line=50,
        )
        assert func.id_string == "handlers/data.py:DataHandler.process:42"

    def test_to_dict(self):
        func = ExtractedFunction(
            name="fetch", qualified_name="ApiClient.fetch", file_path="api.py",
            code="async def fetch(): pass", signature="async def fetch():",
            language="python", start_line=10, end_line=15,
            class_name="ApiClient", is_async=True, docstring="Fetch data",
        )

        d = func.to_dict()
        assert d["name"] == "fetch"
        assert d["qualified_name"] == "ApiClient.fetch"
        assert d["is_async"] is True


class TestConvenienceFunctions:

    def test_filter_functions_convenience(self):
        funcs = [
            ExtractedFunction(
                name="test_something", qualified_name="test_something",
                file_path="test.py", code="def test_something(): pass",
                signature="def test_something():", language="python",
                start_line=1, end_line=2,
            ),
            ExtractedFunction(
                name="real_function", qualified_name="real_function",
                file_path="src/module.py", code="def real_function(): pass",
                signature="def real_function():", language="python",
                start_line=1, end_line=2,
            ),
        ]

        filtered = filter_functions(funcs)
        assert len(filtered) == 1
        assert filtered[0].name == "real_function"
