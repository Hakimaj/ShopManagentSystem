from app.core.config import settings

def test_health_check(client):
    response = client.get(f"{settings.API_STR}/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "service": "CleanCare POS API"
    }
