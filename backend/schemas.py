from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


# ---------- Accounts ----------
class AccountBase(BaseModel):
    user_id: int
    type: Literal["checking", "savings"]
    nickname: str


class AccountCreate(AccountBase):
    balance: Decimal = Decimal("0")


class AccountUpdate(BaseModel):
    user_id: Optional[int] = None
    type: Optional[Literal["checking", "savings"]] = None
    nickname: Optional[str] = None
    balance: Optional[Decimal] = None


class AccountRead(AccountBase):
    id: int
    balance: Decimal
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- Payees ----------
class PayeeCreate(BaseModel):
    name: str


class PayeeUpdate(BaseModel):
    name: Optional[str] = None


class PayeeRead(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


# ---------- Payee Accounts ----------
class PayeeAccountBase(BaseModel):
    payee_id: int
    account_label: str
    account_number: Optional[str] = None
    category: str = "credit card"
    interest_type: Literal["none", "pif", "compound", "loan"] = "none"
    interest_rate: float = 0.0
    current_balance: Decimal = Decimal("0")
    principal_balance: Decimal = Decimal("0")
    accrued_interest: Decimal = Decimal("0")
    due_date: Optional[date] = None


class PayeeAccountCreate(PayeeAccountBase):
    pass


class PayeeAccountUpdate(BaseModel):
    payee_id: Optional[int] = None
    account_label: Optional[str] = None
    account_number: Optional[str] = None
    category: Optional[str] = None
    interest_type: Optional[Literal["none", "pif", "compound", "loan"]] = None
    interest_rate: Optional[float] = None
    current_balance: Optional[Decimal] = None
    principal_balance: Optional[Decimal] = None
    accrued_interest: Optional[Decimal] = None
    due_date: Optional[date] = None


class PayeeAccountRead(PayeeAccountBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Deposits ----------
class DepositCreate(BaseModel):
    account_id: int
    source: str
    amount: Decimal
    date: date


class DepositUpdate(BaseModel):
    account_id: Optional[int] = None
    source: Optional[str] = None
    amount: Optional[Decimal] = None
    date: Optional[date] = None


class DepositRead(DepositCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Transfers ----------
class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal
    date: date


class TransferRead(TransferCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Payments ----------
class PaymentCreate(BaseModel):
    checking_account_id: int
    payee_account_id: int
    amount: Decimal
    date: date


class PaymentUpdate(BaseModel):
    checking_account_id: Optional[int] = None
    payee_account_id: Optional[int] = None
    amount: Optional[Decimal] = None
    date: Optional[date] = None


class PaymentRead(PaymentCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Reports ----------
class DepositsBySourceRow(BaseModel):
    source: str
    total_amount: Decimal


class CashflowMonthlyRow(BaseModel):
    year: int
    month: int
    inflow: Decimal
    outflow: Decimal
    net: Decimal


class PayeeBalanceRow(BaseModel):
    payee_account_id: int
    payee_name: str
    account_label: str
    current_balance: Decimal
    due_date: Optional[date] = None


class PaymentHistoryRow(BaseModel):
    date: date
    amount: Decimal
    checking_account_id: int
    payee_account_id: int
    payee_name: Optional[str] = None
    account_label: Optional[str] = None


class UpcomingDueRow(BaseModel):
    payee_account_id: int
    payee_name: str
    account_label: str
    due_date: date
    current_balance: Decimal