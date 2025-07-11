import logging
import sys
from .config import settings

# Get a logger instance
logger = logging.getLogger("trosyn_sync")

def setup_logging():
    """Configures the application's logging."""
    log_level = settings.LOG_LEVEL.upper()
    logger.setLevel(log_level)

    # Create a handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    # Create a formatter and add it to the handler
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)

    # Add the handler to the logger
    if not logger.handlers:
        logger.addHandler(handler)

    # Prevent duplicate logging to root logger
    logger.propagate = False

    # Configure uvicorn logging
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("uvicorn.error").handlers = [handler]
