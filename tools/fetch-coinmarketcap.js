import axios from "axios";
import fs from "fs/promises";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import sqlite from "better-sqlite3";
import async from "async";
const API_KEY = "22d5d8c0-fe03-49ac-8014-b6b71eaa967d";
const BATCH_SIZE = 5000;

const BASE_URL =
  "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";
// Headers for authentication
const headers = {
  Accepts: "application/json",
  "X-CMC_PRO_API_KEY": API_KEY,
};

const savetoDatabase = async (data) => {
  const db = drizzle(sqlite("data.db"));
  try {
    const coinmarketcapTable = sqliteTable("coinmarketcap", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      category: text("category").notNull(),
      name: text("name").notNull(),
      ticker: text("ticker").notNull(),
      marketCap: real("market_cap").notNull(),
    });
    if (data.length > 0) {
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        await db.insert(coinmarketcapTable).values(batch).execute();
        console.log(`Inserted batch of ${batch.length} records.`);
      }
      // await db.insert(coinmarketcapTable).values(data).execute();
    } else {
      console.log(`No valid records to save for this batch`);
    }
  } catch (error) {
    console.error(`Error saving to database:`, error);
  }
};

// Function to fetch cryptocurrency data
const fetchCryptoData = async (start, limit = 500) => {
  const params = {
    start: start,
    limit: limit,
    convert: "USD",
  };
  try {
    const response = await axios.get(BASE_URL, { headers, params });
    return response.data.data.map((coin) => ({
      category: coin.tags.join(", "),
      ticker: coin.symbol,
      name: coin.name,
      marketCap: coin.quote.USD.market_cap,
    }));
  } catch (error) {
    console.error(`Error fetching data (start: ${start}):`, error.message);
    return [];
  }
};
// Fetch data in parallel
const fetchAllCryptoData = async (totalRecords = 10000, batchSize = 500) => {
  const tasks = [];
  for (let i = 1; i <= totalRecords; i += batchSize) {
    tasks.push((callback) => {
      fetchCryptoData(i, batchSize)
        .then((data) => callback(null, data))
        .catch((error) => callback(error, null));
    });
  }
  // Execute tasks in parallel
  async.parallelLimit(tasks, 5, (err, results) => {
    if (err) {
      console.error("Error during parallel execution:", err);
    } else {
      // Flatten results and print
      const allData = results.flat();
      console.log(allData.length);
      fs.writeFile("result.json", JSON.stringify(allData, null, 2));
      savetoDatabase(allData);
    }
  });
};
// Fetch 10,000 records
fetchAllCryptoData();
