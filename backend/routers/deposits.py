from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Deposit, Account
from schemas import DepositCreate, DepositRead

router = APIRouter(prefix="/deposits", tags=["deposits"])

@router.post("/", response_model=DepositRead)
def create_deposit(deposit: DepositCreate, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == deposit.account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")

    # Increase account balance
    acc.balance += deposit.amount
    d = Deposit(**deposit.dict())
    
    db.add_all([acc, d])
    db.commit()
    db.refresh(d)
    return d

@router.get("/", response_model=list[DepositRead])
def list_deposits(db: Session = Depends(get_db)):
    return db.query(Deposit).all()

@router.get("/account/{account_id}", response_model=list[DepositRead])
def list_deposits_for_account(account_id: int, db: Session = Depends(get_db)):
    return db.query(Deposit).filter(Deposit.account_id == account_id).all()