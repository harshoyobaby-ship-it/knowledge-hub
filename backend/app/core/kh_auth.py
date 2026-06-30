"""Knowledge Hub JWT authentication bridge.

Validates the same HS256 tokens issued by the Next.js app (kh_auth_token cookie).
"""

from dataclasses import dataclass
from typing import Any

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    user_id: str
    email: str
    role: str
    first_name: str
    last_name: str
    department_id: str | None = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


def decode_kh_token(token: str) -> AuthenticatedUser | None:
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        return None

    user_id = payload.get("userId")
    email = payload.get("email")
    role = payload.get("role")
    first_name = payload.get("firstName")
    last_name = payload.get("lastName")

    if not all(isinstance(v, str) and v for v in [user_id, email, role, first_name, last_name]):
        return None

    department_id = payload.get("departmentId")
    if department_id is not None and not isinstance(department_id, str):
        department_id = None

    return AuthenticatedUser(
        user_id=user_id,
        email=email,
        role=role,
        first_name=first_name,
        last_name=last_name,
        department_id=department_id,
    )
