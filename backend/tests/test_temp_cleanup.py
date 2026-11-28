from __future__ import annotations

from pathlib import Path

import pytest

from app.parsers.storage import ephemeral_upload_path


def test_temp_directory_deleted_on_success():
    captured_dir: Path | None = None
    with ephemeral_upload_path("pdf", writer=lambda p: p.write_bytes(b"%PDF-1.7")) as path:
        captured_dir = path.parent
        assert path.exists()
        assert path.read_bytes() == b"%PDF-1.7"

    assert captured_dir is not None
    assert not captured_dir.exists()


def test_temp_directory_deleted_on_validation_failure_and_exception():
    captured_dir: Path | None = None

    with pytest.raises(RuntimeError, match="simulated parse crash"):
        with ephemeral_upload_path("docx", writer=lambda p: p.write_bytes(b"PK\x03\x04")) as path:
            captured_dir = path.parent
            assert path.exists()
            raise RuntimeError("simulated parse crash")

    assert captured_dir is not None
    assert not captured_dir.exists()
