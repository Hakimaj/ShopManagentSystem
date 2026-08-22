from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_admin
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService
from app.models.user import User
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users — Admin only."""
    return [UserResponse.model_validate(u)
            for u in UserService(db).list_users()]


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update username and/or password for any user — Admin only."""
    svc = UserService(db)
    try:
        user = svc.update_user(user_id, user_in)
        return UserResponse.model_validate(user)
    except EntityNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)
    except DuplicateEntityException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)
