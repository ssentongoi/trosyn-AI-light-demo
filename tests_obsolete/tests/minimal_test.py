"""Minimal test file to isolate TestClient compatibility issues."""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

# Create a minimal FastAPI app
app = FastAPI()

@app.get("/test")
async def test_endpoint():
    return {"message": "Test successful"}

def test_minimal_client():
    """Test that we can create and use a TestClient."""
    client = TestClient(app)
    response = client.get("/test")
    assert response.status_code == 200
    assert response.json() == {"message": "Test successful"}

if __name__ == "__main__":
    test_minimal_client()
    print("Minimal test passed!")
