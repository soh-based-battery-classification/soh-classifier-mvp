from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db.session import Base, engine
from app.api.packs import router as packs_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="EV Battery Recycling Judge System")
app.include_router(packs_router)

STATIC_DIR = Path(__file__).parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def root():
    # 브라우저로 직접 접속하면 간단한 웹 UI를 보여줌
    return FileResponse(str(STATIC_DIR / "index.html"))
