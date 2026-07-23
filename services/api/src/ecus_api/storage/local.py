import hashlib
import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Protocol


class BlobStore(Protocol):
    def put(self, content: bytes) -> str: ...
    def read(self, key: str) -> bytes: ...


class LocalBlobStore:
    """Immutable content-addressed storage, independent of user-supplied filenames.

    Call from an executor when used in async request/job code. The root is a
    trusted private directory, never a publicly served upload location.
    """

    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    def _path(self, key: str) -> Path:
        if not re.fullmatch(r"[a-f0-9]{64}", key):
            raise ValueError("Invalid storage key")
        path = self.root / key[:2] / key
        if not path.resolve().is_relative_to(self.root):
            raise ValueError("Storage path escapes configured root")
        return path

    def put(self, content: bytes) -> str:
        key = hashlib.sha256(content).hexdigest()
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            return key
        temporary: str | None = None
        try:
            with NamedTemporaryFile(dir=path.parent, delete=False) as stream:
                temporary = stream.name
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            if temporary and os.path.exists(temporary):
                os.unlink(temporary)
        return key

    def read(self, key: str) -> bytes:
        return self._path(key).read_bytes()
