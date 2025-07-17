from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "message": "Trosyn AI API is running", "version": "1.0.0"}


@router.post("/reset-db", status_code=204)
def reset_database(db: Session = Depends(get_db)):
    """
    Reset the database (for testing only).
    WARNING: This will drop all tables and recreate them.
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return JSONResponse(
        status_code=status.HTTP_204_NO_CONTENT,
        content={"message": "Database reset successfully"},
    )
