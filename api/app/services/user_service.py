from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, LoginRequest
from app.models.user import User, UserRole
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.exceptions import EntityNotFoundException, DuplicateEntityException, BusinessValidationException

class UserService:
    def __init__(self, db: Session):
        self.repository = UserRepository(db)

    def create_user(self, user_in: UserCreate) -> User:
        if self.repository.get_by_username(user_in.username.strip()):
            raise DuplicateEntityException(f"Username '{user_in.username}' is already taken.")
        if self.repository.get_by_email(user_in.email.strip()):
            raise DuplicateEntityException(f"Email '{user_in.email}' is already registered.")

        user_data = user_in.model_dump()
        user_data["username"] = user_in.username.strip()
        user_data["email"] = user_in.email.strip()
        user_data["hashed_password"] = get_password_hash(user_in.password)
        del user_data["password"]

        return self.repository.create(user_data)

    def authenticate(self, login_in: LoginRequest) -> tuple[User, str]:
        user = self.repository.get_by_username(login_in.username.strip())
        if not user:
            # Check by email as fallback
            user = self.repository.get_by_email(login_in.username.strip())

        if not user or not verify_password(login_in.password, user.hashed_password):
            raise BusinessValidationException("Incorrect username or password.")

        if not user.is_active:
            raise BusinessValidationException("User account is inactive.")

        token = create_access_token(subject=user.id, role=user.role)
        return user, token

    def get_user_by_id(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise EntityNotFoundException("User not found.")
        return user
