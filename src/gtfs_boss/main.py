import logging
import traceback

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from gtfs_boss.api import validation

app = FastAPI(
    title="GTFS Boss API",
    description="API for validating and analyzing GTFS feeds",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",  # Alternative localhost
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(validation.router, prefix="/api/v1")

# Global Exception Handler to catch and log all unhandled exceptions
@app.exception_handler(Exception)
async def exception_handler(request: Request, exc: Exception):
    # Log the detailed traceback of the exception
    logger.error(f"Unhandled exception occurred: {exc}\n{traceback.format_exc()}")
    
    # For simplicity, return a generic 500 error response. 
    # In a production app, you might want to return more specific error details based on the exception type.
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc) # Include the exception message
        }
    )

@app.get("/")
async def root():
    return {
        "message": "Welcome to GTFS Boss",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 