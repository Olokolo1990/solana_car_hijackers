import os

import httpx

_AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "")
_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")


async def trigger_crash_call(driver_id: str, trip_id: str) -> None:
    """Initiates an ElevenLabs AI agent call when a crash is detected."""
    if not _AGENT_ID or not _API_KEY:
        return

    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.elevenlabs.io/v1/convai/conversations",
            headers={"xi-api-key": _API_KEY},
            json={
                "agent_id": _AGENT_ID,
                "conversation_initiation_client_data": {
                    "dynamic_variables": {
                        "driver_id": driver_id,
                        "trip_id": trip_id,
                    }
                },
            },
            timeout=10,
        )
