"""Tests for AI summary generation."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from services.search_v2 import SummaryGenerator, ExtractedFunction, generate_summaries


def make_func(name: str, code: str = "def x(): pass") -> ExtractedFunction:
    return ExtractedFunction(
        name=name,
        qualified_name=name,
        file_path="test.py",
        code=code,
        signature=f"def {name}():",
        language="python",
        start_line=1,
        end_line=2,
    )


class TestSummaryGenerator:

    @pytest.fixture
    def generator(self):
        return SummaryGenerator(batch_size=3)

    @pytest.mark.asyncio
    async def test_generate_single(self, generator):
        func = make_func("process_data", "def process_data(items): return [x*2 for x in items]")

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Doubles each item in the input list."))]

        with patch.object(generator.client.chat.completions, 'create', new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            summary = await generator.generate_single(func)

        assert summary == "Doubles each item in the input list."
        mock.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_batch(self, generator):
        funcs = [
            make_func("fetch_users"),
            make_func("save_data"),
            make_func("validate_input"),
        ]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(
            content="1. Retrieves user records from database.\n2. Persists data to storage.\n3. Validates input parameters."
        ))]

        with patch.object(generator.client.chat.completions, 'create', new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            summaries = await generator.generate_batch(funcs)

        assert len(summaries) == 3
        assert "user" in summaries[0].lower()
        assert "data" in summaries[1].lower() or "storage" in summaries[1].lower()
        assert "valid" in summaries[2].lower()

    @pytest.mark.asyncio
    async def test_generate_batch_handles_fewer_responses(self, generator):
        funcs = [make_func("a"), make_func("b"), make_func("c")]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Only one summary"))]

        with patch.object(generator.client.chat.completions, 'create', new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            summaries = await generator.generate_batch(funcs)

        assert len(summaries) == 3
        assert summaries[0] == "Only one summary"
        assert summaries[1] == ""
        assert summaries[2] == ""

    @pytest.mark.asyncio
    async def test_generate_all_batches_correctly(self, generator):
        funcs = [make_func(f"func_{i}") for i in range(7)]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(
            content="1. Summary one\n2. Summary two\n3. Summary three"
        ))]

        with patch.object(generator.client.chat.completions, 'create', new_callable=AsyncMock) as mock:
            mock.return_value = mock_response
            summaries = await generator.generate_all(funcs)

        # batch_size=3, so 7 funcs = 3 API calls
        assert mock.call_count == 3
        assert len(summaries) == 7

    @pytest.mark.asyncio
    async def test_generate_single_handles_error(self, generator):
        func = make_func("broken")

        with patch.object(generator.client.chat.completions, 'create', new_callable=AsyncMock) as mock:
            mock.side_effect = Exception("API error")
            summary = await generator.generate_single(func)

        assert summary == ""

    @pytest.mark.asyncio
    async def test_generate_batch_handles_error(self, generator):
        funcs = [make_func("a"), make_func("b")]

        with patch.object(generator.client.chat.completions, 'create', new_callable=AsyncMock) as mock:
            mock.side_effect = Exception("API error")
            summaries = await generator.generate_batch(funcs)

        assert summaries == ["", ""]

    @pytest.mark.asyncio
    async def test_empty_input(self, generator):
        summaries = await generator.generate_batch([])
        assert summaries == []

        summaries = await generator.generate_all([])
        assert summaries == []


class TestConvenienceFunction:

    @pytest.mark.asyncio
    async def test_generate_summaries_convenience(self):
        funcs = [make_func("test_func")]

        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Test summary"))]

        with patch('services.search_v2.summary_generator.AsyncOpenAI') as MockClient:
            mock_client = MagicMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            MockClient.return_value = mock_client

            summaries = await generate_summaries(funcs, batch_size=5)

        assert len(summaries) == 1
        assert summaries[0] == "Test summary"
