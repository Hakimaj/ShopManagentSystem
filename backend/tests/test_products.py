from app.core.config import settings
from app.db.seed import seed_database

def get_admin_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "admin", "password": "admin123"})
    return resp.json()["access_token"]

def get_staff_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "staff", "password": "staff123"})
    return resp.json()["access_token"]

def test_products_crud_and_validation(client, db_session):
    seed_database(db_session)
    admin_token = get_admin_token(client)
    staff_token = get_staff_token(client)

    # 1. List products with pagination
    resp = client.get(f"{settings.API_STR}/products?page=1&size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 5
    assert data["meta"]["total"] >= 11

    # 2. Search products
    search_resp = client.get(f"{settings.API_STR}/products?search=Detergent")
    assert search_resp.status_code == 200
    assert len(search_resp.json()["items"]) > 0

    # 3. Create Product with Staff token
    create_payload = {
        "sku": "NEW-PROD-999",
        "name": "Glass Cleaner Spray 750ml",
        "category_id": 1,
        "cost_price": 60.00,
        "selling_price": 95.00,
        "current_stock": 25,
        "description": "Streak-free glass shine"
    }
    create_resp = client.post(
        f"{settings.API_STR}/products",
        json=create_payload,
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert create_resp.status_code == 201
    prod_id = create_resp.json()["id"]

    # 4. Duplicate SKU should fail with 409
    dup_resp = client.post(
        f"{settings.API_STR}/products",
        json=create_payload,
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert dup_resp.status_code == 409

    # 5. Invalid Price validation (negative price)
    bad_price_payload = {**create_payload, "sku": "NEW-PROD-888", "cost_price": -10}
    bad_price_resp = client.post(
        f"{settings.API_STR}/products",
        json=bad_price_payload,
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert bad_price_resp.status_code == 422 # Pydantic validation error

    # 6. Update Product
    update_resp = client.put(
        f"{settings.API_STR}/products/{prod_id}",
        json={"name": "Glass Cleaner Spray 1000ml", "selling_price": 110.00},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Glass Cleaner Spray 1000ml"
    assert update_resp.json()["selling_price"] == "110.00"

    # 7. Adjust Stock via Dedicated Endpoint
    stock_resp = client.patch(
        f"{settings.API_STR}/products/{prod_id}/stock",
        json={"new_stock": 50},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert stock_resp.status_code == 200
    assert stock_resp.json()["current_stock"] == 50

    # 8. Deactivate Product with Admin token
    del_resp = client.delete(
        f"{settings.API_STR}/products/{prod_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["is_active"] is False

    # 9. Verify soft-deleted product is excluded from default active list
    active_resp = client.get(f"{settings.API_STR}/products?is_active=true&size=100")
    assert not any(p["id"] == prod_id for p in active_resp.json()["items"])
