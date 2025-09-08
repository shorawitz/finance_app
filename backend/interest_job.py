# interest_job.py
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, PayeeAccount # Assuming models.py is in the same directory

# --- Database Setup (replace with your actual DB connection) ---
DATABASE_URL = "sqlite:///./sql_app.db" # Example SQLite, use PostgreSQL for production
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# --- End Database Setup ---

def apply_monthly_interest():
    db = SessionLocal()
    try:
        today = date.today()
        accounts = db.query(PayeeAccount).all()

        for acc in accounts:
            # Skip if already calculated for this month
            if acc.last_interest_calc and acc.last_interest_calc.month == today.month and acc.last_interest_calc.year == today.year:
                continue

            if acc.interest_type == "none":
                continue

            elif acc.interest_type == "pif":
                # For 'pay-in-full' accounts, reset balance if it's the start of a new cycle
                # This logic might need refinement based on exact 'pif' rules (e.g., statement close date)
                acc.current_balance = 0.0
                acc.principal_balance = 0.0
                acc.accrued_interest = 0.0

            elif acc.interest_type == "compound":
                if acc.current_balance > 0:
                    monthly_rate = acc.interest_rate / 12.0
                    interest_amount = round(acc.current_balance * monthly_rate, 2)
                    acc.current_balance = round(acc.current_balance + interest_amount, 2)
                    # For compound, we can just update current_balance, or if we want to track principal/interest
                    # for all, we'd need to ensure principal_balance is also updated or derived.
                    # For simplicity, if 'compound' is not 'loan', we just update current_balance.
                    acc.accrued_interest = round(acc.accrued_interest + interest_amount, 2) # Track accrued interest
                    acc.principal_balance = round(acc.current_balance - acc.accrued_interest, 2) # Derive principal

            elif acc.interest_type == "loan":
                if acc.principal_balance > 0:
                    monthly_rate = acc.interest_rate / 12.0
                    interest_on_principal = round(acc.principal_balance * monthly_rate, 2)
                    acc.accrued_interest = round(acc.accrued_interest + interest_on_principal, 2)
                    acc.current_balance = round(acc.principal_balance + acc.accrued_interest, 2)

            acc.last_interest_calc = today
            db.add(acc)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error during interest calculation: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Ensure tables are created if running this script directly for testing
    # In a real FastAPI app, this would be handled by migrations or app startup
    Base.metadata.create_all(bind=engine)
    apply_monthly_interest()
    print("Monthly interest calculation job completed.")