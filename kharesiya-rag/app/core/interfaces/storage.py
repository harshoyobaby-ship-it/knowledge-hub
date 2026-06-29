from typing import Protocol


class FileStorage(Protocol):
    async def save(self, filename: str, content: bytes, subdirectory: str = "uploads") -> str:
        ...

    async def read(self, path: str) -> bytes:
        ...

    async def delete(self, path: str) -> None:
        ...

    async def exists(self, path: str) -> bool:
        ...
