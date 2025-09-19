from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
import models
import database

router = APIRouter(prefix="/payee-accounts", tags=["Payee Accounts Logic"])

def calc_amortization(balance: float, rate: float, months: int):
    schedule = []
    monthly_rate = rate / 12
    if rate > 0 and months:
        payment = balance * (monthly_rate * (1 + monthly_rate) ** months) / ((1 + monthly_rate) ** months - 1)
    else:
        payment = balance / months if months else balance

    remaining = balance
    for m in range(1, months + 1):
        interest = remaining * monthly_rate
        principal = payment - interest
        remaining -= principal
        schedule.append({
            "month": m,
            "payment": round(payment, 2),
            "principal": round(principal, 2),
            "interest": round(interest, 2),
            "remaining": round(max(remaining, 0), 2)
        })
    return payment, schedule

@router.get("/{id}/recommended-payment")
def recommended_payment(id: int, db: Session = Depends(database.get_db)):
    acct = db.query(models.PayeeAccount).get(id)
    if not acct:
        raise HTTPException(404, "Payee account not found")

    if acct.interest_type == "loan" and acct.loan_term_months:
        payment, _ = calc_amortization(acct.current_balance, acct.interest_rate, acct.loan_term_months)
        return {"recommended_payment": round(payment, 2)}

    if acct.category == "credit card":
        # Promo?
        if acct.promo_term_months:
            promo_pay = acct.current_balance / acct.promo_term_months
            if acct.require_min_payment and acct.min_payment_amount:
                return {"recommended_payment": float(max(acct.min_payment_amount, promo_pay))}
            return {"recommended_payment": round(promo_pay, 2)}
        # Default: pay in full
        return {"recommended_payment": float(acct.current_balance)}

    return {"recommended_payment": 0.0}

@router.get("/{id}/amortization")
def amortization_schedule(id: int, db: Session = Depends(database.get_db)):
    acct = db.query(models.PayeeAccount).get(id)
    if not acct:
        raise HTTPException(404, "Payee account not found")

    if not acct.loan_term_months:
        raise HTTPException(400, "Amortization only available for loans with a term")

    payment, schedule = calc_amortization(acct.current_balance, acct.interest_rate, acct.loan_term_months)
    return {"monthly_payment": round(payment, 2), "schedule": schedule}