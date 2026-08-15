from app.core.config import settings
from app.db.seed import seed_database

def test_auth_login_success(client, db_session):
    seed_database(db_session)

    # Test Admin login
    resp = client.post(
        f"{settings.API_STR}/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "ADMIN"

    # Test Staff login
    resp_staff = client.post(
        f"{settings.API_STR}/auth/login",
        json={"username": "staff", "password": "staff123"}
    )
    assert resp_staff.status_code == 200
    assert resp_staff.json()["user"]["role"] == "STAFF"

def test_auth_login_failure(client, db_session):
    seed_database(db_session)

    # Wrong password
    resp = client.post(
        f"{settings.API_STR}/auth/login",
        json={"username": "admin", "password": "wrong-password"}
    )
    assert resp.status_code == 401

    # Non-existent user
    resp_none = client.post(
        f"{settings.API_STR}/auth/login",
        json={"username": "nonexistent_user", "password": "anypassword"}
    )
    assert resp_none.status_code == 401

def test_auth_me_profile_and_unauthorized(client, db_session):
    seed_database(db_session)

    # Login to get token
    login_resp = client.post(
        f"{settings.API_STR}/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_resp.json()["access_token"]

    # Valid token on /me
    me_resp = client.get(
        f"{settings.API_STR}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin"

    # Missing token on /me
    unauth_resp = client.get(f"{settings.API_STR}/auth/me")
    assert unauth_resp.status_code == 401

    # Malformed token
    bad_token_resp = client.get(
        f"{settings.API_STR}/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"}
    )
    assert bad_token_resp.status_code == 401
