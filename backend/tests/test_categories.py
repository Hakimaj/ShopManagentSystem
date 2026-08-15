from app.core.config import settings
from app.db.seed import seed_database

def get_admin_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]

def get_staff_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "staff", "password": "staff123"})
    return resp.json()["access_token"]

def test_categories_crud(client, db_session):
    seed_database(db_session)
    admin_token = get_admin_token(client)
    staff_token = get_staff_token(client)

    # 1. List categories (publicly accessible or with staff)
    list_resp = client.get(f"{settings.API_STR}/categories")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 5

    # 2. Create Category with Staff credentials
    create_resp = client.post(
        f"{settings.API_STR}/categories",
        json={"name": "Kitchen Hygiene"},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert create_resp.status_code == 201
    cat_id = create_resp.json()["id"]
    assert create_resp.json()["name"] == "Kitchen Hygiene"

    # 3. Duplicate Category Name should return 409 Conflict
    dup_resp = client.post(
        f"{settings.API_STR}/categories",
        json={"name": "Kitchen Hygiene"},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert dup_resp.status_code == 409

    # 4. Get Category by ID
    get_resp = client.get(f"{settings.API_STR}/categories/{cat_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == cat_id

    # 5. Update Category
    update_resp = client.put(
        f"{settings.API_STR}/categories/{cat_id}",
        json={"name": "Kitchen & Pantry Care"},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Kitchen & Pantry Care"

    # 6. Delete Category with Admin privileges
    del_resp = client.delete(
        f"{settings.API_STR}/categories/{cat_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_resp.status_code == 204

    # 7. Accessing deleted Category returns 404
    missing_resp = client.get(f"{settings.API_STR}/categories/{cat_id}")
    assert missing_resp.status_code == 404
