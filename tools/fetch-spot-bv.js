import { batchInsert } from "#src/db-utils.js";
import datetime from "datetime";
import db from "#src/database.js";
import { spot } from "#src/schema.js";
import { chromium } from "playwright";
import fs from "fs";
import https from "https";
import AdmZip from "adm-zip";
import unzipper from "unzipper";
import readline from "readline";
import tickers from "#src/tickers.js";
const BASE_URL = "https://data.binance.vision/?prefix=data/spot/monthly/klines";
const target_path = "../output";

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
  // for (const zip_url of zipFiles) {
  const zipBuffer = await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(target_path);
    https
      .get(
        "https://data.binance.vision/data/spot/monthly/klines/ETHBTC/1h/ETHBTC-1h-2023-05.zip",
        (response) => {
          if (response.statusCode !== 200) {
            reject(`Failed to download: ${response.statusCode}`);
            return;
          }
          response.pipe(file);
          file.on("finish", () => file.close(() => resolve(target_path)));

          // const chunks = [];
          // response.on("data", (chunk) => chunks.push(chunk));
          // response.on("end", () => resolve(Buffer.concat(chunks)));
        }
      )
      .on("error", (err) => {
        fs.unlink(target_path, () => reject(err));
      });
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
          const [timestamp, open, high, low, close, volume, ...rest] =
            line.split(",");
          const date = await convertTimestampToDate(timestamp);
          return {
            symbol: ticker,
            interval: "ls",
            timestamp: date,
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            volume: parseFloat(volume),
          };
        })
    );
    await saveToDatabase(rows);
  } else {
    console.error(`No files found in the zip archive.`);
  }
  // }
}

async function saveToDatabase(rows) {
  try {
    if (rows.length > 0) {
      await batchInsert(db, spot, rows);
    } else {
      console.log(`No valid records to save for this batch`);
    }
  } catch (error) {
    console.error(`Error saving to database:`, error);
  }
}

const convertTimestampToDate = async (timeStamp) => {
  const date = new Date(parseInt(timeStamp)).toISOString();
  return date;
};
async function main() {
  // for (const ticker of tickers) {
  const ZIP_URL = `${BASE_URL}/ETHBTC/1h/`;
  await getZipfiles(ZIP_URL, "ETHBTC");
  // }
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
