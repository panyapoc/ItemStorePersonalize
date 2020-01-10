"use strict";

const chromium = require("chrome-aws-lambda");

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials" : true
};

/**
 * Initialise headless browser for web scraping
 */
async function init() {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });

  const page = await browser.newPage();

  return { browser, page };
}

const initP = init();

exports.handler = async (event, context) => {
  // Return immediately if being called by warmer
  if (event.source === "warmer") {
    return "Lambda is warm";
  }

  const asin = event.queryStringParameters.asin;

  // Return empty OK response for empty ASIN:
  if (!asin) return { statusCode: 200, headers: responseHeaders, body: "" };

  // ...Otherwise fetch from Amazon.com:
  const url = `https://www.amazon.com/dp/${asin}`;
  let browser, page;
  try {
    // Ideally, we share browser and page between invocations:
    // Brackets necessary per https://stackoverflow.com/questions/50164560/object-destructuring-and-handling-exceptions
    ({ browser, page } = await initP);
  } catch (err) {
    // If initialisation failed, keep retrying on every invocation:
    initP = init();
    try {
      // Brackets necessary per https://stackoverflow.com/questions/50164560/object-destructuring-and-handling-exceptions
      ({ browser, page } = await initP);
    } catch (err) {
      // Retry has failed: report error
      return { statusCode: 500, headers: responseHeaders, body: `Failed to initialise web scraper: ${err.message}` };
    }
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    const textContent = await page.evaluate(() => {
      const raw = Array.from(document.querySelectorAll('#feature-bullets li .a-list-item'))
      return raw.map(
        n => n.textContent.replace(/\n/g, " ").replace(/\s+/g, " ").trim()
      );
    });

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({ ASIN: asin, Items: textContent }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: err.stack || err.message,
    };
  }
}
