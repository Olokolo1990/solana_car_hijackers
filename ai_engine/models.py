from typing import Literal
from pydantic import BaseModel, Field


class GPSPoint(BaseModel):
    lat: float
    lon: float
    speed_kmh: float
    timestamp: str


class AccelReading(BaseModel):
    x: float  # longitudinal G-force (negative = braking)
    y: float  # lateral G-force (cornering)
    z: float  # vertical G-force
    timestamp: str


class TelematicsLog(BaseModel):
    driver_id: str
    trip_id: str
    gps: list[GPSPoint]
    accelerometer: list[AccelReading]


class DriverReport(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Safety score — higher is safer")
    risk_level: Literal["low", "medium", "high"]
    crash_detected: bool
    summary: str
