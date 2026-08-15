import io
from decimal import Decimal
from app.core.config import settings
from app.db.seed import seed_database

def get_auth_token(client, username, password):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]

def test_full_api_workflow(client, db_session):
    # 1. Seed database with baseline data
    seed_database(db_session)

    # 2. Test Auth
    admin_token = get_auth_token(client, "admin", "admin123")
    staff_token = get_auth_token(client, "staff", "staff123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # Wrong credentials should fail
    bad_login = client.post(f"{settings.API_STR}/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert bad_login.status_code == 401

    # Check /api/auth/me
    me_resp = client.get(f"{settings.API_STR}/auth/me", headers=admin_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin"
    assert me_resp.json()["role"] == "ADMIN"

    # 3. Categories API
    cat_resp = client.get(f"{settings.API_STR}/categories")
    assert cat_resp.status_code == 200
    assert len(cat_resp.json()) >= 5

    # Create new category
    new_cat = client.post(
        f"{settings.API_STR}/categories",
        json={"name": "Eco Cleaning"},
        headers=staff_headers
    )
    assert new_cat.status_code == 201
    cat_id = new_cat.json()["id"]

    # Duplicate category should fail with 409
    dup_cat = client.post(
        f"{settings.API_STR}/categories",
        json={"name": "Eco Cleaning"},
        headers=staff_headers
    )
    assert dup_cat.status_code == 409

    # 4. Products API
    prod_resp = client.get(f"{settings.API_STR}/products?page=1&size=20")
    assert prod_resp.status_code == 200
    assert prod_resp.json()["meta"]["total"] >= 11

    # Create Product
    new_prod = client.post(
        f"{settings.API_STR}/products",
        json={
            "sku": "ECO-VINEGAR-1L",
            "name": "White Vinegar 1L",
            "category_id": cat_id,
            "cost_price": 50.00,
            "selling_price": 85.00,
            "current_stock": 30,
            "description": "Natural cleaning vinegar"
        },
        headers=staff_headers
    )
    assert new_prod.status_code == 201
    prod_id = new_prod.json()["id"]

    # Search product
    search_resp = client.get(f"{settings.API_STR}/products?search=Vinegar")
    assert search_resp.status_code == 200
    assert any(p["sku"] == "ECO-VINEGAR-1L" for p in search_resp.json()["items"])

    # Stock Adjustment
    stock_adj = client.patch(
        f"{settings.API_STR}/products/{prod_id}/stock",
        json={"new_stock": 45},
        headers=staff_headers
    )
    assert stock_adj.status_code == 200
    assert stock_adj.json()["current_stock"] == 45

    # 5. POS Checkout API
    checkout_payload = {
        "payment_method": "Telebirr",
        "items": [
            {
                "product_id": prod_id,
                "quantity": 5,
                "sold_price": 85.00
            }
        ]
    }
    checkout_resp = client.post(
        f"{settings.API_STR}/transactions",
        json=checkout_payload,
        headers=staff_headers
    )
    assert checkout_resp.status_code == 201
    txn_data = checkout_resp.json()
    assert txn_data["total_revenue"] == "425.00"
    assert txn_data["total_profit"] == "175.00" # (85 - 50) * 5

    # Verify stock was automatically deducted (45 - 5 = 40)
    updated_prod = client.get(f"{settings.API_STR}/products/{prod_id}")
    assert updated_prod.json()["current_stock"] == 40

    # Insufficient stock checkout should fail
    excessive_checkout = client.post(
        f"{settings.API_STR}/transactions",
        json={
            "payment_method": "Cash",
            "items": [{"product_id": prod_id, "quantity": 1000, "sold_price": 85.00}]
        },
        headers=staff_headers
    )
    assert excessive_checkout.status_code == 400

    # 6. Sales History & Dashboard API
    txn_list = client.get(f"{settings.API_STR}/transactions", headers=staff_headers)
    assert txn_list.status_code == 200
    assert txn_list.json()["total"] >= 6 # 5 seeded + 1 newly created

    dash_resp = client.get(f"{settings.API_STR}/dashboard/summary?period=all", headers=staff_headers)
    assert dash_resp.status_code == 200
    assert dash_resp.json()["kpi"]["orders_count"] >= 6

    # 7. Image Upload API
    fake_image = io.BytesIO(b"fake image bytes content")
    fake_image.name = "product_sample.png"
    upload_resp = client.post(
        f"{settings.API_STR}/uploads/image",
        files={"file": ("product_sample.png", fake_image, "image/png")},
        headers=staff_headers
    )
    assert upload_resp.status_code == 200
    assert "url" in upload_resp.json()
    assert upload_resp.json()["url"].startswith("/static/uploads/")
