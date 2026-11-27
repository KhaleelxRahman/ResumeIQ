import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    cfg = app.config["APP_CONFIG"]
    debug_override = os.getenv("FLASK_DEBUG")
    debug_enabled = (
        debug_override.strip().lower() in {"1", "true", "yes", "on"}
        if debug_override is not None
        else cfg.APP_ENV.strip().lower() == "development"
    )
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=debug_enabled,
    )
