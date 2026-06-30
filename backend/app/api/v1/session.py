from fastapi import APIRouter, Depends

from app.core.kh_auth import AuthenticatedUser
from app.dependencies import get_current_user

router = APIRouter(prefix="/session", tags=["session"])


@router.get("")
async def get_session(current_user: AuthenticatedUser = Depends(get_current_user)) -> dict:
    """Validate Knowledge Hub JWT and return the authenticated user context."""
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "role": current_user.role,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "department_id": current_user.department_id,
    }
