from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[schemas.AccountRead])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(models.Account).all()


@router.post("/", response_model=schemas.AccountRead)
def create_account(acc: schemas.AccountCreate, db: Session = Depends(get_db)):
    account = models.Account(**acc.dict())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put("/{account_id}", response_model=schemas.AccountRead)
def update_account(account_id: int, acc: schemas.AccountUpdate, db: Session = Depends(get_db)):
    db_acc = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not db_acc:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in acc.dict(exclude_unset=True).items():
        setattr(db_acc, field, value)
    db.commit()
    db.refresh(db_acc)
    return db_acc


@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    db_acc = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not db_acc:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(db_acc)
    db.commit()
    return {"ok": True}