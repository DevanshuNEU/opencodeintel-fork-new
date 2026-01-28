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
                raise Exception(f"GitHub API error: {response.status_code}")

            repos = []
            for repo in response.json():
                if not include_forks and repo.get("fork", False):
                    continue
                repos.append(GitHubRepo(
                    id=repo["id"],
                    name=repo["name"],
                    full_name=repo["full_name"],
                    description=repo.get("description"),
                    html_url=repo["html_url"],
                    clone_url=repo["clone_url"],
                    ssh_url=repo["ssh_url"],
                    default_branch=repo.get("default_branch", "main"),
                    private=repo["private"],
                    fork=repo.get("fork", False),
                    stargazers_count=repo.get("stargazers_count", 0),
                    language=repo.get("language"),
                    size=repo.get("size", 0),
                    owner_login=repo["owner"]["login"],
                    owner_avatar=repo["owner"]["avatar_url"]
                ))
            return repos

    async def get_all_repos(self, include_forks: bool = False) -> list[GitHubRepo]:
        """Fetch all repos with pagination"""
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
            # Safety limit to prevent infinite loops
            if page > 10:
                break
        return all_repos
