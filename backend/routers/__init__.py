# backend/routers/__init__.py
from fastapi import APIRouter

from .accounts import router as accounts_router
from .payees import router as payees_router
from .deposits import router as deposits_router
from .transfers import router as transfers_router
from .payments import router as payments_router
from .reports import router as reports_router

api_router = APIRouter()

# Each sub-router already defines its own prefix (e.g., "/payments"),
# so we can include them directly.
api_router.include_router(accounts_router)
api_router.include_router(payees_router)
api_router.include_router(deposits_router)
api_router.include_router(transfers_router)
api_router.include_router(payments_router)
api_router.include_router(reports_router)

__all__ = ["api_router"]