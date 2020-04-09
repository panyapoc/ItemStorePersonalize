"""Basic shim for contextlib.nullcontext for Python 3.6 and below"""

# Python Built-Ins:
from contextlib import contextmanager

@contextmanager
def nullcontext(enter_result=None):
    yield enter_result
