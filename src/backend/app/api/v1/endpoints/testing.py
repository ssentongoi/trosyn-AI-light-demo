from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import Base, get_db, engine

router = APIRouter()

@router.post("/reset-db", status_code=204)
def reset_database(db: Session = Depends(get_db)):
    # This is a dangerous operation and should be protected
    # For now, we'll allow it to be open for testing purposes
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return
