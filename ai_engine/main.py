from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI

from analyzer import analyze_telematics
from models import DriverReport, TelematicsLog
from notifications import trigger_crash_call

app = FastAPI(title="Driver AI Engine", version="0.1.0")


@app.post("/analyze", response_model=DriverReport)
async def analyze(log: TelematicsLog) -> DriverReport:
    report = await analyze_telematics(log)
    if report.crash_detected:
        await trigger_crash_call(log.driver_id, log.trip_id)
    return report


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
