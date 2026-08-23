from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models_db
from .config import CORS_ORIGINS
from .database import Base, engine
from .routers import chatbot, detection, packs, soh

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOH Classifier API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(packs.router)
app.include_router(soh.router)
app.include_router(detection.router)
app.include_router(chatbot.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
