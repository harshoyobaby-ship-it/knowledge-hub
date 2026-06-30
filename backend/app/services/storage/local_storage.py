import asyncio
import os
from pathlib import Path

from app.core.config import get_settings
from app.core.interfaces.storage import FileStorage

settings = get_settings()


class LocalFileStorage:
    def __init__(self, base_dir: str | None = None) -> None:
        self.base_dir = Path(base_dir or settings.upload_dir).resolve()
        self.documents_dir = Path(settings.documents_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.documents_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, path: str) -> Path:
        resolved = Path(path).resolve()
        allowed_roots = {self.base_dir, self.documents_dir}
        if not any(resolved.is_relative_to(root) for root in allowed_roots):
            raise ValueError("Invalid file path")
        return resolved

    async def save(self, filename: str, content: bytes, subdirectory: str = "uploads") -> str:
        target_dir = self.base_dir if subdirectory == "uploads" else self.documents_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        safe_name = os.path.basename(filename)
        file_path = target_dir / safe_name

        if file_path.exists():
            stem = file_path.stem
            suffix = file_path.suffix
            counter = 1
            while file_path.exists():
                file_path = target_dir / f"{stem}_{counter}{suffix}"
                counter += 1

        await asyncio.to_thread(file_path.write_bytes, content)
        return str(file_path)

    async def read(self, path: str) -> bytes:
        file_path = self._resolve_path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        return await asyncio.to_thread(file_path.read_bytes)

    async def delete(self, path: str) -> None:
        file_path = self._resolve_path(path)
        if file_path.exists():
            await asyncio.to_thread(file_path.unlink)

    async def exists(self, path: str) -> bool:
        file_path = self._resolve_path(path)
        return file_path.exists()
