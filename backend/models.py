# models.py
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import date

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)

    accounts = relationship("Account", back_populates="user")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False) # 'checking', 'savings'
    nickname = Column(String, nullable=False)
    balance = Column(Float, default=0.0)

    user = relationship("User", back_populates="accounts")
    deposits = relationship("Deposit", back_populates="account")
    payments = relationship("Payment", back_populates="checking_account")
    transfers_from = relationship("Transfer", foreign_keys="[Transfer.from_account_id]", back_populates="from_account")
    transfers_to = relationship("Transfer", foreign_keys="[Transfer.to_account_id]", back_populates="to_account")

class Deposit(Base):
    __tablename__ = "deposits"
    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    source = Column(String, nullable=False)   # e.g., Employer A, Client B
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)

    account = relationship("Account", back_populates="deposits")

class Payee(Base):
    __tablename__ = "payees"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)

    accounts = relationship("PayeeAccount", back_populates="payee")

class PayeeAccount(Base):
    __tablename__ = "payee_accounts"
    id = Column(Integer, primary_key=True)
    payee_id = Column(Integer, ForeignKey("payees.id"), nullable=False)
    account_label = Column(String, nullable=False)
    account_number = Column(String, nullable=True)
    category = Column(String, nullable=False)          # credit card, loan, mortgage, etc
    interest_type = Column(String, default="none")     # 'none', 'pif', 'compound', 'loan'
    interest_rate = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    principal_balance = Column(Float, default=0.0)
    accrued_interest = Column(Float, default=0.0)
    due_date = Column(Date, nullable=True)
    last_interest_calc = Column(Date, nullable=True)

    # 🔹 NEW FIELDS
    loan_term_months = Column(Integer, nullable=True)        # e.g. 36 months
    promo_term_months = Column(Integer, nullable=True)       # credit card promo term
    require_min_payment = Column(Integer, default=0)         # 0=false, 1=true
    min_payment_amount = Column(Float, nullable=True)

    payee = relationship("Payee", back_populates="accounts")
    payments = relationship("Payment", back_populates="payee_account")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    checking_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    payee_account_id = Column(Integer, ForeignKey("payee_accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)

    checking_account = relationship("Account", back_populates="payments")
    payee_account = relationship("PayeeAccount", back_populates="payments")

class Transfer(Base):
    __tablename__ = "transfers"
    id = Column(Integer, primary_key=True)
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)

    from_account = relationship("Account", foreign_keys=[from_account_id], back_populates="transfers_from")
    to_account = relationship("Account", foreign_keys=[to_account_id], back_populates="transfers_to")