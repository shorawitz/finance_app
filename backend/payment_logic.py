# payment_logic.py
from models import Payment, PayeeAccount

def apply_payment(db, payment: Payment, acc: PayeeAccount):
    """
    Apply a new payment to the given PayeeAccount.
    Mutates balances in acc.
    """
    amount = payment.amount

    if acc.interest_type == "none":
        acc.current_balance = max(acc.current_balance - amount, 0)

    elif acc.interest_type == "pif":
        acc.current_balance = max(acc.current_balance - amount, 0)

    elif acc.interest_type == "compound":
        if acc.accrued_interest > 0:
            applied_to_interest = min(amount, acc.accrued_interest)
            acc.accrued_interest -= applied_to_interest
            amount -= applied_to_interest
        # Rest goes toward total balance
        acc.current_balance = max(acc.current_balance - amount, 0)
        acc.principal_balance = max(acc.current_balance - acc.accrued_interest, 0)

    elif acc.interest_type == "loan":
        if acc.accrued_interest > 0:
            applied_to_interest = min(amount, acc.accrued_interest)
            acc.accrued_interest -= applied_to_interest
            amount -= applied_to_interest
        if amount > 0 and acc.principal_balance > 0:
            applied_to_principal = min(amount, acc.principal_balance)
            acc.principal_balance -= applied_to_principal
            amount -= applied_to_principal
        acc.current_balance = acc.principal_balance + acc.accrued_interest

    # Save changes
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc