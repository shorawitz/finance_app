from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, extract, and_
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import Deposit, Payment, PayeeAccount, Account

router = APIRouter(prefix="/reports", tags=["reports"])

# 1) Deposits by source (optionally by date range and/or account)
@router.get("/deposits-by-source")
def deposits_by_source(
    db: Session = Depends(get_db),
    start_date: date | None = None,
    end_date: date | None = None,
    account_id: int | None = None
):
    q = db.query(
        Deposit.source,
        func.count(Deposit.id).label("count"),
        func.sum(Deposit.amount).label("total_amount"),
    )
    if start_date:
        q = q.filter(Deposit.date >= start_date)
    if end_date:
        q = q.filter(Deposit.date <= end_date)
    if account_id:
        q = q.filter(Deposit.account_id == account_id)
    q = q.group_by(Deposit.source).order_by(func.sum(Deposit.amount).desc())
    rows = q.all()
    return [
        {"source": r[0], "count": int(r[1] or 0), "total_amount": float(r[2] or 0.0)}
        for r in rows
    ]

# 2) Payee balances summary (group by payee and by category)
@router.get("/payees-balances-summary")
def payee_balances_summary(db: Session = Depends(get_db)):
    # by payee
    by_payee = db.query(
        PayeeAccount.payee_id,
        func.sum(PayeeAccount.current_balance).label("total_balance")
    ).group_by(PayeeAccount.payee_id).all()

    # by category
    by_category = db.query(
        PayeeAccount.category,
        func.sum(PayeeAccount.current_balance).label("total_balance")
    ).group_by(PayeeAccount.category).all()

    return {
        "by_payee": [{"payee_id": pid, "total_balance": float(total or 0.0)} for pid, total in by_payee],
        "by_category": [{"category": cat, "total_balance": float(total or 0.0)} for cat, total in by_category]
    }

# 3) Payment history for a payee account
@router.get("/payments-history")
def payments_history(
    db: Session = Depends(get_db),
    payee_account_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None
):
    q = db.query(Payment).order_by(Payment.date.desc())
    if payee_account_id:
        q = q.filter(Payment.payee_account_id == payee_account_id)
    if start_date:
        q = q.filter(Payment.date >= start_date)
    if end_date:
        q = q.filter(Payment.date <= end_date)

    payments = q.all()
    return [
        {
            "id": p.id,
            "date": p.date,
            "amount": p.amount,
            "payee_account_id": p.payee_account_id,
            "checking_account_id": p.checking_account_id
        } for p in payments
    ]

# 4) Cash flow by month (net inflow/outflow), excluding transfers
@router.get("/cashflow-monthly")
def cashflow_monthly(
    db: Session = Depends(get_db),
    year: int | None = None
):
    dq = db.query(
        extract('year', Deposit.date).label("y"),
        extract('month', Deposit.date).label("m"),
        func.sum(Deposit.amount).label("inflow")
    ).group_by("y", "m")

    pq = db.query(
        extract('year', Payment.date).label("y"),
        extract('month', Payment.date).label("m"),
        func.sum(Payment.amount).label("outflow")
    ).group_by("y", "m")

    if year:
        dq = dq.having(extract('year', Deposit.date) == year)
        pq = pq.having(extract('year', Payment.date) == year)

    deposits = {(int(y), int(m)): float(inflow or 0.0) for y, m, inflow in dq.all()}
    payments = {(int(y), int(m)): float(outflow or 0.0) for y, m, outflow in pq.all()}

    keys = set(deposits.keys()) | set(payments.keys())
    result = []
    for (y, m) in sorted(keys):
        inflow = deposits.get((y, m), 0.0)
        outflow = payments.get((y, m), 0.0)
        result.append({
            "year": y,
            "month": m,
            "inflow": inflow,
            "outflow": outflow,
            "net": inflow - outflow
        })
    return result

# 5) Upcoming due dates (next N days)
@router.get("/payees-upcoming-due")
def upcoming_due(
    db: Session = Depends(get_db),
    within_days: int = 21
):
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    horizon = today + timedelta(days=within_days)
    rows = db.query(PayeeAccount).filter(
        and_(PayeeAccount.due_date != None, PayeeAccount.due_date <= horizon)
    ).order_by(PayeeAccount.due_date.asc()).all()

    return [
        {
            "payee_account_id": r.id,
            "payee_id": r.payee_id,
            "label": r.account_label,
            "category": r.category,
            "due_date": r.due_date,
            "current_balance": float(r.current_balance or 0.0),
            "interest_type": r.interest_type,
            "account_number": r.account_number
        } for r in rows
    ]