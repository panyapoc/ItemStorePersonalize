"""Utilities for dealing with .json.gz gzipped JSON lines files"""

# Python Built-Ins:
import csv
import gzip
import json
import os
from typing import Any, BinaryIO, Generator, List, Union
import zlib

# Local Dependencies:
from .nullcontext import nullcontext

# TODO: Roll CSV, non-lines-JSON, and non-gzipped support into this fn, and use in data_folder_to_list?
def json_gz_reader(file: Union[BinaryIO, str], encoding: str="utf-8") -> Generator[Any, None, None]:
    """Generate (stream) parsed objects from a gzipped JSON lines file
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


def decode_json_or_jsonl(raw: str) -> List[Any]:
    """Load (batch) A JSON or JSON-Lines string as objects
    Tries regular JSON first, defaults to JSON-Lines on error
    """
    try:
        # Try real JSON first:
        return json.loads(raw)
    except json.JSONDecodeError as err:
        # Try JSON lines:
        lines = raw.split("\n")
        # Discard empty final datum if the file has trailing newline:
        if not lines[-1]:
            lines.pop()
        return [json.loads(line) for line in lines]


def data_folder_to_list(folder, csv_dialect="excel"):
    """Load (batch) a folder of CSV and/or JSON files, possibly GZ compressed, into a combined list var"""
    contents = []
    for filename in os.listdir(folder):
        # Ignore hidden files:
        if filename[0] in (".", "$"):
            continue
        filepath = os.path.join(folder, filename)
        print(f"Loading {filepath}")
        fileroot, _,lastext = filename.lower().rpartition(".")
        compressed = True if lastext == "gz" else False
        typeext = fileroot.rpartition(".")[2] if compressed else lastext

        if typeext == "csv":
            if compressed:
                with gzip.GzipFile(filepath, "r") as f:
                    # gzip file is binary and csv needs text mode:
                    with io.TextIOWrapper(fileobj, encoding="utf-8") as text_file:
                        reader = csv.DictReader(text_file, dialect=csv_dialect)
                        data = [row for row in reader]
            else:
                with open(filepath, "r") as f:
                    reader = csv.DictReader(f, dialect=csv_dialect)
                    data = [row for row in reader]
        elif typeext == "json":
            if compressed:
                with gzip.GzipFile(filepath, "r") as f:
                    data = decode_json_or_jsonl(f.read().decode("utf-8"))
            else:
                with open(filepath, "r") as f:
                    data = decode_json_or_jsonl(f.read())
        else:
            raise ValueError(f"Type of file {filename} could not be recognised")

        contents += data
    return contents
