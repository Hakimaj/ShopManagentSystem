import io
from app.core.config import settings
from app.db.seed import seed_database

def get_staff_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "staff", "password": "staff123"})
    return resp.json()["access_token"]

def test_image_uploads(client, db_session):
    seed_database(db_session)
    staff_token = get_staff_token(client)
    headers = {"Authorization": f"Bearer {staff_token}"}

    # 1. Valid image upload (PNG)
    png_image = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRsample")
    upload_resp = client.post(
        f"{settings.API_STR}/uploads/image",
        files={"file": ("product.png", png_image, "image/png")},
        headers=headers
    )
    assert upload_resp.status_code == 200
    assert "url" in upload_resp.json()
    assert upload_resp.json()["url"].startswith("/static/uploads/")
    assert upload_resp.json()["url"].endswith(".png")

    # 2. Disallowed MIME type (e.g. text/plain, svg)
    bad_file = io.BytesIO(b"<svg>alert(1)</svg>")
    svg_resp = client.post(
        f"{settings.API_STR}/uploads/image",
        files={"file": ("malicious.svg", bad_file, "image/svg+xml")},
        headers=headers
    )
    assert svg_resp.status_code == 400

    # 3. Oversized file (> 5MB)
    big_file = io.BytesIO(b"0" * (5 * 1024 * 1024 + 1024))
    big_resp = client.post(
        f"{settings.API_STR}/uploads/image",
        files={"file": ("huge.jpg", big_file, "image/jpeg")},
        headers=headers
    )
    assert big_resp.status_code == 400

    # 4. Unauthorized upload (no token)
    unauth_resp = client.post(
        f"{settings.API_STR}/uploads/image",
        files={"file": ("product.png", io.BytesIO(b"png"), "image/png")}
    )
    assert unauth_resp.status_code == 401
