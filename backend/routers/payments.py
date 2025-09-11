from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/", response_model=list[schemas.PaymentRead])
def list_payments(db: Session = Depends(get_db)):
    return db.query(models.Payment).all()


@router.post("/", response_model=schemas.PaymentRead)
def create_payment(pay: schemas.PaymentCreate, db: Session = Depends(get_db)):
    payment = models.Payment(**pay.dict())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/{payment_id}", response_model=schemas.PaymentRead)
def update_payment(payment_id: int, pay: schemas.PaymentUpdate, db: Session = Depends(get_db)):
    db_pay = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not db_pay:
        raise HTTPException(status_code=404, detail="Payment not found")
    for field, value in pay.dict(exclude_unset=True).items():
        setattr(db_pay, field, value)
    db.commit()
    db.refresh(db_pay)
    return db_pay


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    db_pay = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not db_pay:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(db_pay)
    db.commit()
    return {"ok": True}