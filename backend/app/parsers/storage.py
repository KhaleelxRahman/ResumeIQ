from __future__ import annotations

import shutil
import tempfile
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, Iterator


@contextmanager
def ephemeral_upload_path(
    extension: str,
    writer: Callable[[Path], None] | None = None,
    on_cleanup: Callable[[Path], None] | None = None,
) -> Iterator[Path]:
    """
    Allocate a temporary file path inside an isolated TemporaryDirectory and
    guarantee deletion on success, validation failure, or unexpected exceptions.
    """
    safe_ext = extension.lower().lstrip(".")
    suffix = f".{safe_ext}" if safe_ext else ""
    temp_dir = Path(tempfile.mkdtemp(prefix="resumeiq_upload_"))
    target_path = temp_dir / f"{uuid.uuid4().hex}{suffix}"

    try:
        if writer is not None:
            writer(target_path)
        yield target_path
    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=False)
        if on_cleanup is not None:
            on_cleanup(temp_dir)
