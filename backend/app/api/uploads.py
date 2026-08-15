import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from app.api.deps import require_staff_or_admin
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

class ImageUploadResponse(BaseModel):
    url: str
    filename: str

@router.post("/image", response_model=ImageUploadResponse)
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_staff_or_admin)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type '{file.content_type}'. Allowed types: JPEG, PNG, WebP, GIF."
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension '{ext}'. Allowed extensions: .jpg, .jpeg, .png, .webp, .gif"
        )
    if not ext:
        ext = ".webp" if file.content_type == "image/webp" else ".jpg"

    # Read content to verify file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5MB limit."
        )

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / unique_filename

    # Save securely to disk
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    return ImageUploadResponse(
        url=f"/static/uploads/{unique_filename}",
        filename=unique_filename
    )
