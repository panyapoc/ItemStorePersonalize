"""UCSD data pre-(before the workshop)-processing utilities

See the 
"""

# Python Built-Ins:
import json
from typing import BinaryIO, Set, Union
import zlib

# Local Dependencies:
from dataformat import json_gz_reader
from nullcontext import nullcontext

def remove_unused_items(
    fin: Union[BinaryIO, str],
    fout: Union[BinaryIO, str],
    asin_set: Set[str],
    max_cold_start: float=0.01,
    encoding: str="utf-8"
) -> None:
    """Copy item metadata file including no more than max_cold_start ratio of unlisted items

    Stream the contents of `fin` (which may be bigger than memory), to `fname_out`, keeping every
    item with `item["asin"] in asin_set` and allowing unlisted items through only when doing so
    would keep the current ratio of unlisted to total written items < `max_cold_start`.

    Kept unused items are therefore deterministic (since the stream is processed in order), but not
    guaranteed to be close to max_cold_start (e.g. if all of the seen `asin_set` items are at the
    end of the file)

    Parameters
    ----------
    fin : Union[BinaryIO, str]
        Local path or handle to an existing .json.gz file of product data
    fout : Union[BinaryIO, str]
        Local path or handle to a .json.gz file to be (over)-written with filtered product data
    asin_set : Set[str]
        Set of product IDs that an item["asin"] should be `in` to pass
    max_cold_start : float, optional
        Maximum ratio of un-listed item IDs to allow through
    encoding : str, optional
        Applied to both input and output files
    """
    n_items_seen = 0
    n_used_items = 0
    n_unused_items_kept = 0
    prefix = "" # Overwriting var more performant than "if at least one item has been written"

    ctx = open(fout, "wb") if isinstance(fout, str) else nullcontext(fout)
    with ctx as outfile:
        cmp = zlib.compressobj(wbits=16 + zlib.MAX_WBITS)  # offset 16 to include header
        for item in json_gz_reader(fin, encoding=encoding):
            n_items_seen += 1
            keep_item = False
            if (item["asin"] in asin_set):
                n_used_items += 1
                keep_item = True
            elif (
                (n_unused_items_kept + 1) / (n_used_items + n_unused_items_kept + 1)
                < max_cold_start
            ):
                n_unused_items_kept += 1
                keep_item = True
            if keep_item:
                chunk = cmp.compress((prefix + json.dumps(item)).encode(encoding))
                prefix = "\n"
                if chunk:
                    outfile.write(chunk)
        chunk = cmp.flush()
        if chunk:
            outfile.write(chunk)

    print("Done!")
    print(f"Saw {n_items_seen} items")
    print(f"Kept {n_used_items} used + {n_unused_items_kept} unused items")
    print(f"Total {n_used_items + n_unused_items_kept} items retained")
