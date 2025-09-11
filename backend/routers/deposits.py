from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(prefix="/deposits", tags=["deposits"])


@router.get("/", response_model=list[schemas.DepositRead])
def list_deposits(db: Session = Depends(get_db)):
    return db.query(models.Deposit).all()


@router.post("/", response_model=schemas.DepositRead)
def create_deposit(dep: schemas.DepositCreate, db: Session = Depends(get_db)):
    deposit = models.Deposit(**dep.dict())
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.put("/{deposit_id}", response_model=schemas.DepositRead)
def update_deposit(deposit_id: int, dep: schemas.DepositUpdate, db: Session = Depends(get_db)):
    db_dep = db.query(models.Deposit).filter(models.Deposit.id == deposit_id).first()
    if not db_dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    for field, value in dep.dict(exclude_unset=True).items():
        setattr(db_dep, field, value)
    db.commit()
    db.refresh(db_dep)
    return db_dep


@router.delete("/{deposit_id}")
def delete_deposit(deposit_id: int, db: Session = Depends(get_db)):
    db_dep = db.query(models.Deposit).filter(models.Deposit.id == deposit_id).first()
    if not db_dep:
        raise HTTPException(status_code=404, detail="Deposit not found")
    db.delete(db_dep)
    db.commit()
    return {"ok": True}