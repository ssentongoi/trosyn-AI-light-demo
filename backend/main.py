from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.summarize import router as summarize_router
from routes.spellcheck import router as spellcheck_router

async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown

app = FastAPI(
    title="Trosyn Document API",
    version="0.1.0",
    lifespan=lifespan
)

# Allow CORS for local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(summarize_router, prefix="/api")
app.include_router(spellcheck_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Trosyn Document API is running."}
