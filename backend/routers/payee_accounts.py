from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/payee-accounts", tags=["payee-accounts"])


@router.get("/", response_model=list[schemas.PayeeAccountRead])
def list_payee_accounts(db: Session = Depends(get_db)):
    return db.query(models.PayeeAccount).all()


@router.post("/", response_model=schemas.PayeeAccountRead)
def create_payee_account(pa: schemas.PayeeAccountCreate, db: Session = Depends(get_db)):
    payee_account = models.PayeeAccount(**pa.dict())
    db.add(payee_account)
    db.commit()
    db.refresh(payee_account)
    return payee_account


@router.put("/{payee_account_id}", response_model=schemas.PayeeAccountRead)
def update_payee_account(payee_account_id: int, pa: schemas.PayeeAccountUpdate, db: Session = Depends(get_db)):
    db_pa = db.query(models.PayeeAccount).filter(models.PayeeAccount.id == payee_account_id).first()
    if not db_pa:
        raise HTTPException(status_code=404, detail="Payee Account not found")
    for field, value in pa.dict(exclude_unset=True).items():
        setattr(db_pa, field, value)
    db.commit()
    db.refresh(db_pa)
    return db_pa


@router.delete("/{payee_account_id}")
def delete_payee_account(payee_account_id: int, db: Session = Depends(get_db)):
    db_pa = db.query(models.PayeeAccount).filter(models.PayeeAccount.id == payee_account_id).first()
    if not db_pa:
        raise HTTPException(status_code=404, detail="Payee Account not found")
    db.delete(db_pa)
    db.commit()
    return {"ok": True}