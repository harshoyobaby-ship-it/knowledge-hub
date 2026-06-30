from typing import Protocol


class LLMClient(Protocol):
    async def generate(self, system: str, user: str) -> str:
        ...

    async def health_check(self) -> bool:
        ...
