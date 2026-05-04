import pytest
from pydantic import ValidationError

from models import AccelReading, DriverReport, GPSPoint, TelematicsLog


def test_driver_report_valid():
    report = DriverReport(score=85, risk_level="low", crash_detected=False, summary="Safe trip.")
    assert report.score == 85
    assert report.risk_level == "low"


def test_driver_report_score_out_of_range():
    with pytest.raises(ValidationError):
        DriverReport(score=101, risk_level="low", crash_detected=False, summary="x")
    with pytest.raises(ValidationError):
        DriverReport(score=-1, risk_level="low", crash_detected=False, summary="x")


def test_driver_report_invalid_risk_level():
    with pytest.raises(ValidationError):
        DriverReport(score=50, risk_level="extreme", crash_detected=False, summary="x")


def test_telematics_log_valid():
    log = TelematicsLog(
        driver_id="d1",
        trip_id="t1",
        gps=[GPSPoint(lat=40.7, lon=-74.0, speed_kmh=60.0, timestamp="2024-01-01T00:00:00")],
        accelerometer=[AccelReading(x=0.0, y=0.0, z=1.0, timestamp="2024-01-01T00:00:00")],
    )
    assert log.driver_id == "d1"
    assert len(log.gps) == 1
