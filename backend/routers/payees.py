from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models, schemas

router = APIRouter(prefix="/payees", tags=["payees"])

# -------------------------
# Payees
# -------------------------
@router.post("", response_model=schemas.PayeeRead)
def create_payee(payee: schemas.PayeeCreate, db: Session = Depends(get_db)):
    db_payee = models.Payee(**payee.dict())
    db.add(db_payee)
    db.commit()
    db.refresh(db_payee)
    return db_payee


@router.get("", response_model=List[schemas.PayeeRead])
def list_payees(db: Session = Depends(get_db)):
    return db.query(models.Payee).all()


# -------------------------
# Payee Accounts
# -------------------------
@router.post("/accounts", response_model=schemas.PayeeAccountRead)
def create_payee_account(
    payee_account: schemas.PayeeAccountCreate, db: Session = Depends(get_db)
):
    # Check payee exists
    payee = db.query(models.Payee).filter(models.Payee.id == payee_account.payee_id).first()
    if not payee:
        raise HTTPException(status_code=404, detail="Payee not found")

    db_pa = models.PayeeAccount(**payee_account.dict())
    db.add(db_pa)
    db.commit()
    db.refresh(db_pa)
    return db_pa


@router.get("/accounts", response_model=List[schemas.PayeeAccountRead])
def list_payee_accounts(db: Session = Depends(get_db)):
    return db.query(models.PayeeAccount).all()