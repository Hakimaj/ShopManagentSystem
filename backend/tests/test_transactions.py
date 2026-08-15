from app.core.config import settings
from app.db.seed import seed_database

def get_staff_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "staff", "password": "staff123"})
    return resp.json()["access_token"]

def test_transactions_checkout_and_history(client, db_session):
    seed_database(db_session)
    staff_token = get_staff_token(client)
    headers = {"Authorization": f"Bearer {staff_token}"}

    # 1. Fetch existing product 1 to check initial stock
    prod1 = client.get(f"{settings.API_STR}/products/1").json()
    initial_stock = prod1["current_stock"]
    selling_price = float(prod1["selling_price"])
    cost_price = float(prod1["cost_price"])

    # 2. Perform valid checkout
    buy_qty = 3
    checkout_payload = {
        "payment_method": "Telebirr",
        "items": [
            {
                "product_id": 1,
                "quantity": buy_qty,
                "sold_price": selling_price
            }
        ]
    }
    checkout_resp = client.post(
        f"{settings.API_STR}/transactions",
        json=checkout_payload,
        headers=headers
    )
    assert checkout_resp.status_code == 201
    txn = checkout_resp.json()
    assert txn["payment_method"] == "Telebirr"
    expected_rev = buy_qty * selling_price
    expected_profit = buy_qty * (selling_price - cost_price)
    assert float(txn["total_revenue"]) == expected_rev
    assert float(txn["total_profit"]) == expected_profit

    # 3. Check stock decremented accurately
    prod1_after = client.get(f"{settings.API_STR}/products/1").json()
    assert prod1_after["current_stock"] == initial_stock - buy_qty

    # 4. Check historical transaction snapshot
    txn_id = txn["id"]
    get_txn_resp = client.get(f"{settings.API_STR}/transactions/{txn_id}", headers=headers)
    assert get_txn_resp.status_code == 200
    assert len(get_txn_resp.json()["items"]) == 1
    assert get_txn_resp.json()["items"][0]["product_id"] == 1

    # 5. Overselling / Insufficient Stock should fail and not alter stock
    stock_before_excess = prod1_after["current_stock"]
    excessive_payload = {
        "payment_method": "Cash",
        "items": [{"product_id": 1, "quantity": 9999, "sold_price": selling_price}]
    }
    excess_resp = client.post(f"{settings.API_STR}/transactions", json=excessive_payload, headers=headers)
    assert excess_resp.status_code == 400

    # Verify stock remained untouched after rollback
    prod1_unchanged = client.get(f"{settings.API_STR}/products/1").json()
    assert prod1_unchanged["current_stock"] == stock_before_excess

    # 6. List transactions with filter
    list_resp = client.get(f"{settings.API_STR}/transactions?payment_method=Telebirr", headers=headers)
    assert list_resp.status_code == 200
    assert any(t["id"] == txn_id for t in list_resp.json()["items"])
