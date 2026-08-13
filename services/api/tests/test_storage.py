from pathlib import Path

import pytest

from ecus_api.storage.local import LocalBlobStore


def test_storage_uses_immutable_content_keys_and_rejects_traversal(tmp_path: Path) -> None:
    store = LocalBlobStore(tmp_path / "private")
    first = store.put(b"original document")
    assert store.put(b"original document") == first
    second = store.put(b"revised document")
    assert first != second
    assert store.read(first) == b"original document"
    assert store.read(second) == b"revised document"
    for invalid in ("../.env", "/etc/passwd", "a" * 63):
        with pytest.raises(ValueError):
            store.read(invalid)
