"""Utilities for dealing with (maybe gzipped) CSV and JSON-Lines files

Includes getter functions for fetching standard properties from raw objects e.g. items, interactions.
"""

# Python Built-Ins:
import csv
import gzip
import io
import json
import os
import re
from typing import Any, BinaryIO, Dict, Generator, List, Set, Tuple, Union
import zlib

# Local Dependencies:
from .nullcontext import nullcontext

# TODO: Correct typing annotation for False literal is typing.Literal[False] as of Py3.8
def infer_validate_filetype(
    filename: str,
    supported_types: Set[str]=set(("csv", "json")),
    supported_compressions: Set[str]=set(("gz",)),
) -> Tuple[str, Union[str, bool]]:
    """Infer filetype and presence of compression from filename, and validate type against provided set

    Returns
    -------
    extension :
        The type-descriptive file extension in lower case, e.g. "json" for myfile.json.gz
    compression :
        Either False, or the compression-descriptive final file extension, e.g. "gz" for myfile.json.gz
    """
    filename = filename.lower()
    fileroot, _, lastext = filename.rpartition(".")
    if lastext in supported_compressions:
        compression = lastext
        ext = fileroot.rpartition(".")[2]
    else:
        compression = False
        ext = lastext

    if ext not in supported_types:
        raise ValueError(
            f"Unsupported {'' if compression else 'un'}compressed file type {ext} not in {supported_types}"
        )
    return ext, compression
    

# TODO: Change consumers of this function to use datafile_reader instead?
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


# TODO: Correct typing annotation for a string literal is typing.Literal["infer"] as of Py3.8
def datafile_reader(
    file: Union[BinaryIO, str],
    compression: Union[bool, str]="infer",
    data_format: str="infer",
    encoding: str="utf-8",
    csv_dialect: str="excel",
) -> Generator[Any, None, None]:
    """Generate (stream) parsed objects from a (potentially-gzipped) JSON lines or CSV file

    The first line of a CSV file will be interpreted as a column header.

    Parameters
    ----------
    file :
        A file path string OR an open file in BINARY MODE
    compression :
        "infer" is supported only when `file` is a path, otherwise True (compressed e.g. .json.gz) or False
    data_format :
        "infer" is supported only when `file` is a path, otherwise lowercase file type e.g. "csv", "json"
    encoding :
        If different from UTF-8
    csv_dialect :
        Passed through to csv.DictReader (but note that character encoding is configured separately)
    """
    # Sanitize uncased string inputs:
    data_format = data_format.lower()
    if isinstance(compression, str):
        compression = compression.lower()

    # Validate compression/format config and open file if needed:
    if isinstance(file, str):
        if compression == "infer" or data_format == "infer":
            inferred_ext, inferred_compression = infer_validate_filetype(file)
            if compression == "infer":
                compression = inferred_compression
            if data_format == "infer":
                data_format = inferred_ext
        ctx = open(file, "rb")
    else:  # Assume file is an open IO object
        if "b" not in f.mode:
            raise ValueError("file must be in *binary mode*, or else provide a file path (string)")
        if compression == "infer" or data_format == "infer":
            raise ValueError(
                "compression={}, data_format={}: can only 'infer' from file path str, not file obj".format(
                    compression,
                    data_format,
                )
            )
        ctx = nullcontext(file)

    with ctx as fraw:
        unwrapped_ctx = gzip.GzipFile(fileobj=fraw, mode="r") if compression else nullcontext(fraw)
        with unwrapped_ctx as funwrapped:
            with io.TextIOWrapper(funwrapped, encoding) as text_file:
                if data_format == "csv":
                    reader = csv.DictReader(text_file, dialect=csv_dialect)
                    for row in reader:
                        yield row
                elif data_format == "json":
                    for line in text_file:
                        if line:  # Ignore trailing newline
                            yield json.loads(line)
                else:
                    raise ValueError(f"Unrecognised file type '{data_format}'")

def data_folder_reader(
    folder: str,
    compression: Union[bool, str]="infer",
    data_format: str="infer",
    encoding: str="utf-8",
    csv_dialect: str="excel",
) -> Generator[Any, None, None]:
    """Generate records sequentially from files in `folder` (non-recursing) via datafile_reader"""
    contents = []
    for filename in os.listdir(folder):
        # Ignore hidden files:
        if filename[0] in (".", "$"):
            continue
        filepath = os.path.join(folder, filename)
        print(f"Loading {filepath}")
        for record in datafile_reader(
            filepath,
            compression=compression,
            data_format=data_format,
            encoding=encoding,
            csv_dialect=csv_dialect,
        ):
            yield record


def get_interaction_item_id(event: Dict[str, Any]) -> Union[str, None]:
    return event.get("asin", event.get("item_id", event.get("ASIN", event.get("ITEM_ID"))))

def get_interaction_timestamp(event: Dict[str, Any]) -> int:
    return int(event.get("unixReviewTime", event.get("TIMESTAMP", event.get("timestamp"))))

def get_interaction_user_id(event: Dict[str, Any]) -> Union[str, None]:
    return event.get("reviewerID", event.get("user_id", event.get("reviewerId", event.get("USER_ID"))))

def get_interaction_value(event) -> Union[float, None]:
    return float(
        event.get(
            "overall",
            event.get("EVENT_VALUE", event.get("rating", event.get("score", event.get("price", "nan"))))
        )
    )

def get_item_id(item: Dict[str, Any]) -> Union[str, None]:
    # Try the same keys as on interaction if not a simple 'id':
    return item.get("id", item.get("ID", get_interaction_item_id(item)))

thumbnail_url_exp = re.compile(r"^(.*images-\w+\.ssl-images-amazon.com\/.*\.)(?:_.*_.)(jpg|png)$")
def get_item_imgurl(item: Dict[str, Any]) -> Union[str, None]:
    candidate = item.get("imUrl", item.get("IMGURL", item.get("image", item.get("img_url"))))
    if candidate is None:
        return None

    if not isinstance(candidate, str):
        # Should be a list/tuple/iterable of strs - we'll just take the first one.
        candidate = candidate[0]
        assert isinstance(candidate, str), "Unexpected image URL type on item"

    # If it looks like the URL has been thumbnailed, link to the original image instead:
    match = thumbnail_url_exp.match(candidate)
    if match:
        # stitching captured groups 1 and 2 together constructs the non-thumbnail URL:
        candidate = match[1] + match[2]

    return candidate

def get_item_title(item: Dict[str, Any]) -> str:
    return item.get("title", "Unknown")[:280]

def get_user_id(user: Dict[str, Any]) -> str:
    return user.get("id", user.get("ID", user.get("user_id", user.get("USER_ID"))))
