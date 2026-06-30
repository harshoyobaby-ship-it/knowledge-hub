from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, str]


class MetricsInfo(BaseModel):
    message: str
