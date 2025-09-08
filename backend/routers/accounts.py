from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Account
from schemas import AccountCreate, AccountRead

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.post("/", response_model=AccountRead)
def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    acc = Account(**account.dict())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc

@router.get("/", response_model=list[AccountRead])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()

@router.get("/{account_id}", response_model=AccountRead)
def get_account(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(Account).filter(Account.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return acc