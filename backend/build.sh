#!/usr/bin/env bash
set -euo pipefail

pip install -r requirements.txt
alembic upgrade head
flask --app run.py seed-db
