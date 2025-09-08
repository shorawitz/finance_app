from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Payment, PayeeAccount
from schemas import PaymentCreate, PaymentRead
from payment_logic import apply_payment

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/", response_model=PaymentRead)
def create_payment(payment_data: PaymentCreate, db: Session = Depends(get_db)):
    # Get PayeeAccount
    acc = db.query(PayeeAccount).filter(PayeeAccount.id == payment_data.payee_account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="PayeeAccount not found")

    # Create Payment record
    payment = Payment(
        checking_account_id=payment_data.checking_account_id,
        payee_account_id=payment_data.payee_account_id,
        amount=payment_data.amount,
        date=payment_data.date
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Apply payment logic (update balances)
    apply_payment(db, payment, acc)

    return payment

@router.get("/", response_model=list[PaymentRead])
def list_payments(db: Session = Depends(get_db)):
    return db.query(Payment).all()