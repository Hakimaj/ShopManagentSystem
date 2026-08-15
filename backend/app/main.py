import logging
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.exceptions import (
    AppException,
    EntityNotFoundException,
    DuplicateEntityException,
    BusinessValidationException
)
from app.api import endpoints, auth, categories, products, transactions, dashboard, uploads

# Setup application logging
setup_logging()
logger = logging.getLogger("cleancare")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_STR}/openapi.json",
    docs_url=f"{settings.API_STR}/docs",
    redoc_url=f"{settings.API_STR}/redoc"
)

# CORS configuration - strict methods
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

# Static file serving for uploads
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Global Exception Handlers
@app.exception_handler(EntityNotFoundException)
async def entity_not_found_handler(request: Request, exc: EntityNotFoundException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message}
    )

@app.exception_handler(DuplicateEntityException)
async def duplicate_entity_handler(request: Request, exc: DuplicateEntityException):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": exc.message}
    )

@app.exception_handler(BusinessValidationException)
async def business_validation_handler(request: Request, exc: BusinessValidationException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Mount Routers
app.include_router(endpoints.router, prefix=settings.API_STR)
app.include_router(auth.router, prefix=settings.API_STR)
app.include_router(categories.router, prefix=settings.API_STR)
app.include_router(products.router, prefix=settings.API_STR)
app.include_router(transactions.router, prefix=settings.API_STR)
app.include_router(dashboard.router, prefix=settings.API_STR)
app.include_router(uploads.router, prefix=settings.API_STR)
