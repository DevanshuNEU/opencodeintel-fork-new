"""
Tests for UserLimits -- tier limits, repo count checks, usage summary
"""
import pytest
from unittest.mock import MagicMock, patch
from services.user_limits import UserTier, TIER_LIMITS, UserLimitsService


@pytest.fixture
def limiter():
    from services.user_limits import UserLimitsService, UserTier
    mock_db = MagicMock()
    return UserLimitsService(supabase_client=mock_db, redis_client=None)


class TestTierLimits:
    """Verify the tier limit values we set"""

    def test_free_tier_values(self):
        from services.user_limits import TIER_LIMITS, UserTier
        free = TIER_LIMITS[UserTier.FREE]
        assert free.max_repos == 1, "Free should have 1 repo"
        assert free.max_files_per_repo == 2000, "Free should have 2K files"
        assert free.max_functions_per_repo == 10000, "Free should have 10K functions"
        assert free.priority_indexing is False
        assert free.mcp_access is True

    def test_pro_tier_values(self):
        from services.user_limits import TIER_LIMITS, UserTier
        pro = TIER_LIMITS[UserTier.PRO]
        assert pro.max_repos == 5, "Pro should have 5 repos"
        assert pro.max_files_per_repo == 5000
        assert pro.max_functions_per_repo == 100000, "Pro should have 100K functions"
        assert pro.priority_indexing is True

    def test_enterprise_tier_values(self):
        from services.user_limits import TIER_LIMITS, UserTier
        ent = TIER_LIMITS[UserTier.ENTERPRISE]
        assert ent.max_repos == 10, "Enterprise should have 10 repos"
        assert ent.max_files_per_repo == 50000
        assert ent.max_functions_per_repo == 500000

    def test_all_tiers_have_limits(self):
        from services.user_limits import TIER_LIMITS, UserTier
        for tier in UserTier:
            assert tier in TIER_LIMITS, f"Missing limits for {tier}"

    def test_tier_limits_are_ascending(self):
        """Pro limits should be >= Free, Enterprise >= Pro"""
        from services.user_limits import TIER_LIMITS, UserTier
        free = TIER_LIMITS[UserTier.FREE]
        pro = TIER_LIMITS[UserTier.PRO]
        ent = TIER_LIMITS[UserTier.ENTERPRISE]

        assert pro.max_repos >= free.max_repos
        assert pro.max_files_per_repo >= free.max_files_per_repo
        assert pro.max_functions_per_repo >= free.max_functions_per_repo
        assert ent.max_files_per_repo >= pro.max_files_per_repo
        assert ent.max_functions_per_repo >= pro.max_functions_per_repo


class TestUserTierDetection:
    """Verify tier detection from DB"""
    def test_default_tier_is_free(self, limiter):
        """Unknown users default to free tier"""
        with patch.object(limiter, '_get_tier_from_db', return_value=UserTier.FREE):
            tier = limiter.get_user_tier("nonexistent-user")
        assert tier == UserTier.FREE

    def test_recognizes_pro_tier(self, limiter):
        with patch.object(limiter, '_get_tier_from_db', return_value=UserTier.PRO):
            tier = limiter.get_user_tier("user-123")
        assert tier == UserTier.PRO

    def test_recognizes_enterprise_tier(self, limiter):
        with patch.object(limiter, '_get_tier_from_db', return_value=UserTier.ENTERPRISE):
            tier = limiter.get_user_tier("user-456")
        assert tier == UserTier.ENTERPRISE


class TestRepoCountLimits:
    def test_free_user_can_add_first_repo(self, limiter):
        with patch.object(limiter, 'get_user_tier', return_value=UserTier.FREE), \
             patch.object(limiter, 'get_user_repo_count', return_value=0):
            result = limiter.check_repo_count("user-free")
            assert result.allowed is True

    def test_free_user_blocked_at_limit(self, limiter):
        with patch.object(limiter, 'get_user_tier') as mock_tier:
            mock_tier.return_value = UserTier.FREE
            with patch.object(limiter, 'get_user_repo_count', return_value=1):
                result = limiter.check_repo_count("user-free")
                assert result.allowed is False

    def test_pro_user_can_add_up_to_5(self, limiter):
        with patch.object(limiter, 'get_user_tier') as mock_tier:
            mock_tier.return_value = UserTier.PRO
            with patch.object(limiter, 'get_user_repo_count', return_value=4):
                result = limiter.check_repo_count("user-pro")
                assert result.allowed is True

    def test_pro_user_blocked_at_5(self, limiter):
        with patch.object(limiter, 'get_user_tier') as mock_tier:
            mock_tier.return_value = UserTier.PRO
            with patch.object(limiter, 'get_user_repo_count', return_value=5):
                result = limiter.check_repo_count("user-pro")
                assert result.allowed is False

    def test_enterprise_user_can_add_up_to_10(self, limiter):
        with patch.object(limiter, 'get_user_tier') as mock_tier:
            mock_tier.return_value = UserTier.ENTERPRISE
            with patch.object(limiter, 'get_user_repo_count', return_value=9):
                result = limiter.check_repo_count("user-ent")
                assert result.allowed is True


class TestUsageSummary:
    def test_returns_tier_info(self, limiter):
        with patch.object(limiter, 'get_user_tier') as mock_tier, \
             patch.object(limiter, 'get_limits') as mock_limits, \
             patch.object(limiter, 'get_user_repo_count', return_value=2):
            from services.user_limits import TIER_LIMITS
            mock_tier.return_value = UserTier.PRO
            mock_limits.return_value = TIER_LIMITS[UserTier.PRO]

            summary = limiter.get_usage_summary("user-pro")
            assert summary["tier"] == "pro"
            assert summary["repositories"]["current"] == 2
            assert summary["repositories"]["limit"] == 5
            assert summary["limits"]["max_functions_per_repo"] == 100000
            assert summary["features"]["priority_indexing"] is True

    def test_invalid_user_returns_free_defaults(self, limiter):
        summary = limiter.get_usage_summary("")
        assert summary["tier"] == "free"
        assert summary["repositories"]["current"] == 0
