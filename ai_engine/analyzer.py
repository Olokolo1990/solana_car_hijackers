import json
import os

import google.generativeai as genai
from openai import AsyncOpenAI

from models import DriverReport, TelematicsLog

_openai_client = AsyncOpenAI()

_SYSTEM_PROMPT = (
    "You are a telematics safety analyst. Given driving trip statistics, produce a "
    "structured safety assessment. Score 0–100 where 100 is a perfect driver. "
    "Set risk_level to 'low' (score >= 70), 'medium' (40–69), or 'high' (< 40). "
    "Set crash_detected to true only when crash_threshold_exceeded is true and the "
    "G-force magnitude is consistent with a collision, not just a pothole."
)


def _compute_stats(log: TelematicsLog) -> dict:
    speeds = [p.speed_kmh for p in log.gps]
    g_magnitudes = [
        (r.x**2 + r.y**2 + r.z**2) ** 0.5 for r in log.accelerometer
    ]

    return {
        "max_speed_kmh": max(speeds, default=0),
        "avg_speed_kmh": round(sum(speeds) / len(speeds), 1) if speeds else 0,
        "speeding_events": sum(1 for s in speeds if s > 120),
        "hard_braking_events": sum(1 for r in log.accelerometer if r.x < -0.4),
        "hard_cornering_events": sum(1 for r in log.accelerometer if abs(r.y) > 0.4),
        "max_g_force": round(max(g_magnitudes, default=0), 2),
        "crash_threshold_exceeded": any(g > 4.0 for g in g_magnitudes),
    }


def _build_prompt(stats: dict) -> str:
    return f"Analyze this trip and return a DriverReport JSON:\n{json.dumps(stats, indent=2)}"


async def _call_openai(prompt: str) -> DriverReport:
    response = await _openai_client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format=DriverReport,
    )
    return response.choices[0].message.parsed


def _call_gemini(prompt: str) -> DriverReport:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=_SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
        ),
    )
    response = model.generate_content(prompt)
    return DriverReport(**json.loads(response.text))


async def analyze_telematics(log: TelematicsLog) -> DriverReport:
    stats = _compute_stats(log)
    prompt = _build_prompt(stats)

    if os.getenv("LLM_PROVIDER", "openai").lower() == "gemini":
        return _call_gemini(prompt)
    return await _call_openai(prompt)
