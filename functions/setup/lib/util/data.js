// NodeJS Built-Ins:
const { createGunzip } = require("zlib");

// External Dependencies:
const CsvParse = require("csv-parse");
const split = require("split");

/**
 * Create a chain of transform streams that transform raw file bytes into one object per record.
 * @param {string} source URI of the data file
 * @returns {{ compressed: boolean, fileType: string, streams: Array<stream.Transform>}}
 * 
 * Supports .csv with header row, or newline-delimited .json... Either with optional .gz suffix for
 * compression.
 * 
 * Pipe your raw file input to the first element of `streams`, and pipe the last element into your sink.
 */
function getParseChain(source) {
  const ixLastDot = source.lastIndexOf(".");
  if (ixLastDot < 0) throw new Error("source filename has no file extension to infer file type");

  const ext = source.substring(ixLastDot + 1).toLowerCase();
  const compressed = ext === "gz";

  let fileType;
  const streams = [];
  if (compressed) {
    // (The following won't throw errors even if ixLastDot was -1:)
    const ixSecondDot = source.substring(0, ixLastDot).lastIndexOf(".");
    fileType = source.substring(ixSecondDot + 1, ixLastDot).toLowerCase();
    streams.push(createGunzip());
  } else {
    fileType = ext;
  }

  switch (fileType) {
    case "csv":
      // columns=true produces objects instead of the default (arrays)
      streams.push(CsvParse({ columns: true }));
      break;
    case "json":
      // `split` usually just splits a stream by newlines, but can transform each line too:
      // We need to ignore any empty lines to prevent errors
      streams.push(split(
        (input) => (input ? JSON.parse(input) : null)
      ));
      break;
    default:
      throw new Error(`No parser implemented for file type '.${fileType}'`);
  }

  // Connect the stages up (if there are more than one):
  streams.forEach((s, i) => {
    if ((streams.length - i) > 1) {
      s.pipe(streams[i + 1]);
    }
  });

  return {
    compressed,
    fileType,
    streams,
  };
}

module.exports = {
  getParseChain,
};
