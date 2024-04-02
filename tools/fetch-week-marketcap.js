import { weekInsert } from "#src/db-utils.js";
import db from "#src/database.js";
import { week_cap } from "#src/schema.js";
import { chromium } from "playwright";
import https from "https";
import AdmZip from "adm-zip";
import tickers from "#src/tickers.js";
const BASE_URL = "https://data.binance.vision/?prefix=data/spot/monthly/klines";

async function getZipfiles(url, ticker) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#listing tr");
  const zipFiles = await page.$$eval("#listing tr a", (links) =>
    links
      .map((link) => link.getAttribute("href"))
      .filter((href) => href.endsWith(".zip"))
  );
  const data = await extractAndProcess(zipFiles, ticker);
  await browser.close();
  return data;
}

async function extractAndProcess(zipFiles, ticker) {
  for (const zip_url of zipFiles) {
    const zipBuffer = await new Promise((resolve, reject) => {
      https
        .get(zip_url, (response) => {
          if (response.statusCode !== 200) {
            reject(`Failed to download: ${response.statusCode}`);
            return;
          }

          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => resolve(Buffer.concat(chunks)));
        })
        .on("error", reject);
    });
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    if (zipEntries.length > 0) {
      const csvContent = zip.readAsText(zipEntries[0]);

      // Process CSV content
      const rows = await Promise.all(
        csvContent
          .trim()
          .split("\n")
          .map(async (line) => {
            const [timestamp, open, high, low, close, market_cap, ...rest] =
              line.split(",");
            const date = await convertTimestampToDate(timestamp);
            return {
              symbol: ticker,
              interval: "lw",
              timestamp: date,
              open: parseFloat(open),
              high: parseFloat(high),
              low: parseFloat(low),
              close: parseFloat(close),
              market_cap: parseFloat(market_cap),
            };
          })
      );
      await saveToDatabase(rows);
    } else {
      console.error(`No files found in the zip archive.`);
    }
  }
}

async function saveToDatabase(rows) {
  try {
    if (rows.length > 0) {
      await weekInsert(db, week_cap, rows);
    } else {
      console.log(`No valid records to save for this batch`);
    }
  } catch (error) {
    console.error(`Error saving to database:`, error);
  }
}
const convertTimestampToDate = async (timeStamp) => {
  const date = new Date(parseInt(timeStamp)).toISOString().split("T")[0];
  return date;
};
async function main() {
  for (const ticker of tickers) {
    const ZIP_URL = `${BASE_URL}/${ticker}/1w/`;
    await getZipfiles(ZIP_URL, ticker);
  }
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
