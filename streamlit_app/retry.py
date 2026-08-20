from __future__ import annotations

import re
import time
from typing import Callable, TypeVar

T = TypeVar("T")

_RETRYABLE_PATTERN = re.compile(r"429|RESOURCE_EXHAUSTED|UNAVAILABLE|rate.?limit|overloaded|5\d\d|ECONNRESET|ETIMEDOUT", re.IGNORECASE)


class GenerationError(Exception):
    def __init__(self, message: str, retryable: bool):
        super().__init__(message)
        self.retryable = retryable


def is_retryable_error(err: Exception) -> bool:
    return bool(_RETRYABLE_PATTERN.search(str(err)))


def with_retries(fn: Callable[[], T], max_attempts: int = 3) -> T:
    """Runs fn with exponential backoff on retryable errors. fn should raise
    GenerationError(retryable=...) for known-shape failures, or any Exception for
    SDK/network errors (classified heuristically via is_retryable_error)."""
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except GenerationError as err:
            last_error = err
            if not err.retryable or attempt == max_attempts:
                raise
        except Exception as err:
            last_error = err
            retryable = is_retryable_error(err)
            if not retryable or attempt == max_attempts:
                raise GenerationError(str(err), retryable) from err
        time.sleep(2 ** (attempt - 1))

    raise GenerationError(str(last_error) if last_error else "Unknown error.", False)
