from uuid import UUID

from app.core.security import create_access_token, hash_password, verify_password
from app.models import ApiKey, User
from app.repositories import ApiKeyRepository, UserRepository
from app.schemas.auth import TokenResponse, UserCreate
from app.utils.text import generate_api_key, hash_api_key


class AuthService:
    def __init__(self, user_repo: UserRepository, api_key_repo: ApiKeyRepository) -> None:
        self.user_repo = user_repo
        self.api_key_repo = api_key_repo

    async def register(self, data: UserCreate) -> User:
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            department=data.department,
        )
        return await self.user_repo.create(user)

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("User account is inactive")

        token = create_access_token(
            subject=str(user.id),
            extra_claims={"email": user.email},
        )
        return TokenResponse(access_token=token)

    async def authenticate_api_key(self, raw_key: str) -> User | None:
        key_hash = hash_api_key(raw_key)
        api_key = await self.api_key_repo.get_by_hash(key_hash)
        if not api_key:
            return None
        await self.api_key_repo.touch(api_key)
        return await self.user_repo.get_by_id(api_key.user_id)

    async def create_api_key(self, user_id: UUID, name: str) -> tuple[ApiKey, str]:
        raw_key = generate_api_key()
        api_key = ApiKey(
            user_id=user_id,
            key_hash=hash_api_key(raw_key),
            name=name,
        )
        created = await self.api_key_repo.create(api_key)
        return created, raw_key
