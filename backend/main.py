from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import api_router

app = FastAPI(title="Finance Tracker API")

# CORS middleware - allows frontend to call backend
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.64.7:3000",
    "*"  # Allow all origins for development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def read_root():
    return {"msg": "Finance API is running!"}