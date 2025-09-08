from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Transfer, Account
from schemas import TransferCreate, TransferRead

router = APIRouter(prefix="/transfers", tags=["transfers"])

@router.post("/", response_model=TransferRead)
def create_transfer(transfer: TransferCreate, db: Session = Depends(get_db)):
    if transfer.from_account_id == transfer.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer within same account")

    from_acc = db.query(Account).filter(Account.id == transfer.from_account_id).first()
    to_acc = db.query(Account).filter(Account.id == transfer.to_account_id).first()

    if not from_acc or not to_acc:
        raise HTTPException(status_code=404, detail="One or both accounts not found")

    if from_acc.balance < transfer.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds in source account")

    # Adjust balances
    from_acc.balance -= transfer.amount
    to_acc.balance += transfer.amount

    # Create the transfer record
    t = Transfer(**transfer.dict())
    db.add_all([from_acc, to_acc, t])
    db.commit()
    db.refresh(t)
    return t

@router.get("/", response_model=list[TransferRead])
def list_transfers(db: Session = Depends(get_db)):
    return db.query(Transfer).all()