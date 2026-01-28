"""
GitHub API Service
Handles fetching user repositories and validating tokens
"""
import httpx
from typing import Optional
from dataclasses import dataclass
from services.observability import logger

GITHUB_API_BASE = "https://api.github.com"


@dataclass
class GitHubRepo:
    id: int
    name: str
    full_name: str
    description: Optional[str]
    html_url: str
    clone_url: str
    ssh_url: str
    default_branch: str
    private: bool
    fork: bool
    stargazers_count: int
    language: Optional[str]
    size: int  # in KB
    owner_login: str
    owner_avatar: str


@dataclass
class GitHubUser:
    login: str
    id: int
    avatar_url: Optional[str]
    name: Optional[str]


class GitHubService:
    """Wrapper for GitHub API calls using user's OAuth token"""

    def __init__(self, access_token: str):
        self.token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    async def validate_token(self) -> bool:
        """Check if the token is valid by fetching user info"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GITHUB_API_BASE}/user",
                    headers=self.headers,
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception:
            return False

    async def get_user(self) -> Optional[GitHubUser]:
        """Get authenticated user info"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GITHUB_API_BASE}/user",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code != 200:
                    return None
                data = response.json()
                return GitHubUser(
                    login=data.get("login", ""),
                    id=data.get("id", 0),
                    avatar_url=data.get("avatar_url"),
                    name=data.get("name")
                )
        except (httpx.RequestError, httpx.TimeoutException, KeyError, ValueError) as e:
            logger.error("Failed to fetch GitHub user", error=str(e))
            return None

    async def get_repos(
        self,
        include_forks: bool = False,
        include_private: bool = True,
        per_page: int = 100,
        page: int = 1
    ) -> list[GitHubRepo]:
        """
        Fetch user's repositories (owned + accessible from orgs)
        
        Uses /user/repos which returns repos the user has explicit access to,
        including personal repos and org repos where user is a member
        """
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "visibility": "all" if include_private else "public",
                    "affiliation": "owner,organization_member",
                    "sort": "updated",
                    "direction": "desc",
                    "per_page": per_page,
                    "page": page
                }
                response = await client.get(
                    f"{GITHUB_API_BASE}/user/repos",
                    headers=self.headers,
                    params=params,
                    timeout=30.0
                )
                if response.status_code != 200:
                    logger.error(
                        "GitHub API error fetching repos",
                        status_code=response.status_code,
                        page=page
                    )
                    return []

                repos = []
                for repo in response.json():
                    if not include_forks and repo.get("fork", False):
                        continue
                    repos.append(GitHubRepo(
                        id=repo.get("id", 0),
                        name=repo.get("name", ""),
                        full_name=repo.get("full_name", ""),
                        description=repo.get("description"),
                        html_url=repo.get("html_url", ""),
                        clone_url=repo.get("clone_url", ""),
                        ssh_url=repo.get("ssh_url", ""),
                        default_branch=repo.get("default_branch", "main"),
                        private=repo.get("private", False),
                        fork=repo.get("fork", False),
                        stargazers_count=repo.get("stargazers_count", 0),
                        language=repo.get("language"),
                        size=repo.get("size", 0),
                        owner_login=repo.get("owner", {}).get("login", ""),
                        owner_avatar=repo.get("owner", {}).get("avatar_url", "")
                    ))
                return repos
        except (httpx.RequestError, httpx.TimeoutException) as e:
            logger.error("Network error fetching GitHub repos", error=str(e), page=page)
            return []
        except (KeyError, ValueError, TypeError) as e:
            logger.error("Failed to parse GitHub repos response", error=str(e), page=page)
            return []

    async def get_all_repos(
        self, 
        include_forks: bool = False,
        max_pages: Optional[int] = 10
    ) -> list[GitHubRepo]:
        """
        Fetch all repos with pagination
        
        Args:
            include_forks: Whether to include forked repos
            max_pages: Maximum pages to fetch (None for no limit, default 10)
        """
        all_repos = []
        page = 1
        while True:
            repos = await self.get_repos(
                include_forks=include_forks,
                per_page=100,
                page=page
            )
            if not repos:
                break
            all_repos.extend(repos)
            if len(repos) < 100:
                break
            page += 1
            
            if max_pages is not None and page > max_pages:
                logger.warning(
                    "GitHub repo pagination stopped at limit",
                    max_pages=max_pages,
                    total_repos_fetched=len(all_repos),
                    stopped_at_page=page
                )
                break
        return all_repos
