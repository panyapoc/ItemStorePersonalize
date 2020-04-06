"""Utilities for dealing with .json.gz gzipped JSON lines files"""

# Python Built-Ins:
import json
from typing import Any, BinaryIO, Generator, Union
import zlib

# Local Dependencies:
from nullcontext import nullcontext

def json_gz_reader(file: Union[BinaryIO, str], encoding: str="utf-8") -> Generator[Any, None, None]:
    """Generate parsed objects from a gzipped JSON lines file
    Based on https://stackoverflow.com/a/12572031
    """
    nchunks = 0
    ctx = open(file, "rb") if isinstance(file, str) else nullcontext(file)
    with ctx as f:
        dec = zlib.decompressobj(wbits=32 + zlib.MAX_WBITS)  # offset 32 to accept headers
        pending = ""
        for chunk in f:
            nchunks += 1
            raw = dec.decompress(chunk)
            if raw:
                lines = (pending + raw.decode(encoding)).split("\n")
                # Last fragment isn't yet complete - send it back:
                pending = lines.pop()
                # Output the others:
                for line in lines:
                    yield json.loads(line)

        # Stream finished, check remaining text:
        if pending:
            yield json.loads(pending)
