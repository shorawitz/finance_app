from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/payees", tags=["payees"])


@router.get("/", response_model=list[schemas.PayeeRead])
def list_payees(db: Session = Depends(get_db)):
    return db.query(models.Payee).all()


@router.post("/", response_model=schemas.PayeeRead)
def create_payee(payee: schemas.PayeeCreate, db: Session = Depends(get_db)):
    db_payee = models.Payee(**payee.dict())
    db.add(db_payee)
    db.commit()
    db.refresh(db_payee)
    return db_payee


@router.put("/{payee_id}", response_model=schemas.PayeeRead)
def update_payee(payee_id: int, payee: schemas.PayeeUpdate, db: Session = Depends(get_db)):
    db_payee = db.query(models.Payee).filter(models.Payee.id == payee_id).first()
    if not db_payee:
        raise HTTPException(status_code=404, detail="Payee not found")
    for field, value in payee.dict(exclude_unset=True).items():
        setattr(db_payee, field, value)
    db.commit()
    db.refresh(db_payee)
    return db_payee


@router.delete("/{payee_id}")
def delete_payee(payee_id: int, db: Session = Depends(get_db)):
    db_payee = db.query(models.Payee).filter(models.Payee.id == payee_id).first()
    if not db_payee:
        raise HTTPException(status_code=404, detail="Payee not found")
    db.delete(db_payee)
    db.commit()
    return {"ok": True}