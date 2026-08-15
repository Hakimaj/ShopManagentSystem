from app.core.config import settings
from app.db.seed import seed_database

def get_staff_token(client):
    resp = client.post(f"{settings.API_STR}/auth/login", json={"username": "staff", "password": "staff123"})
    return resp.json()["access_token"]

def test_dashboard_summary_aggregations(client, db_session):
    seed_database(db_session)
    staff_token = get_staff_token(client)
    headers = {"Authorization": f"Bearer {staff_token}"}

    # 1. All-time summary
    all_resp = client.get(f"{settings.API_STR}/dashboard/summary?period=all", headers=headers)
    assert all_resp.status_code == 200
    kpi = all_resp.json()["kpi"]
    assert float(kpi["filtered_revenue"]) > 0
    assert float(kpi["filtered_profit"]) > 0
    assert kpi["orders_count"] >= 5

    # 2. Monthly period summary
    month_resp = client.get(f"{settings.API_STR}/dashboard/summary?period=monthly", headers=headers)
    assert month_resp.status_code == 200
    assert "filtered_revenue" in month_resp.json()["kpi"]

    # 3. Filter by Payment Method
    bank_resp = client.get(
        f"{settings.API_STR}/dashboard/summary?period=all&payment_method=Bank",
        headers=headers
    )
    assert bank_resp.status_code == 200
    assert "filtered_revenue" in bank_resp.json()["kpi"]

    # 4. Custom date period
    custom_resp = client.get(
        f"{settings.API_STR}/dashboard/summary?period=custom&custom_date=2026-02-14",
        headers=headers
    )
    assert custom_resp.status_code == 200
