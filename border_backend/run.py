"""
Standalone runner for AI-Based Border Checkpoint Screening Engine.
Run with: python -m border_backend.run
"""
import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("STARTING AI-BASED BORDER CHECKPOINT SCREENING SYSTEM")
    print("Port: 8000 (FastAPI / Uvicorn)")
    print("Capabilities: ICAO 9303 MRZ, ELA, Photo-Swap, Biometrics, Risk Fusion")
    print("=" * 60)
    uvicorn.run("border_backend.app:app", host="0.0.0.0", port=8000, reload=True)
