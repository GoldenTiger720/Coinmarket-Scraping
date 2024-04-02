import axios from "axios";
import fs from "fs/promises";
import {
  top30assetsInsert,
  getTop30assets,
  portfolioInsert,
  getPortfolioValue,
  getSpotBySymbol,
} from "#src/db-utils.js";
import { top30assets, portfoliovalue } from "#src/schema.js";
import db from "#src/database.js";
import { Chart } from "chart.js";
import { program } from "commander";
program
  .option("-c, --category <category>", "Category (BNB)")
  .option("-d, --date <date>", "From date (YYYY-MM-DD)")
  .parse(process.argv);
const options = program.opts();
const API_KEY = "22d5d8c0-fe03-49ac-8014-b6b71eaa967d";

// Fetch and store the top 30 assets by market cap

async function fetchBinanceSymbols(category) {
  const url = "https://api.binance.com/api/v3/exchangeInfo";
  try {
    const response = await axios.get(url);
    const binanceSymbols = response.data.symbols.map((pair) => ({
      symbolBinance: pair.symbol,
      symbolCoinmarketcap: pair.quoteAsset,
    }));
    const filteredSymbolsOnBinance = binanceSymbols.filter(
      (symbol) => symbol.symbolCoinmarketcap === category
    );
    return filteredSymbolsOnBinance;
  } catch (error) {
    console.log(error.message);
  }
}
async function fetchTop30Assets(category, weekStart) {
  const url =
    "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";
  const marketCapData = await axios.get(url, {
    headers: {
      Accepts: "application/json",
      "X-CMC_PRO_API_KEY": API_KEY,
    },
    params: {
      start: 1,
      limit: 5000,
      convert: "USD",
    },
  });
  const allAssets = marketCapData.data.data;
  const filteredAssets = allAssets.filter((asset) =>
    asset.tags.filter((tag) => tag === category)
  );

  const top30 = filteredAssets
    .sort((a, b) => b.quote.USD.market_cap - a.quote.USD.market_cap)
    .slice(0, 30)
    .map((asset) => ({
      category: category,
      week: weekStart,
      symbol: asset.symbol,
      marketCap: asset.quote.USD.market_cap,
      weight: 1,
    }));

  const totalMarketCap = top30.reduce((sum, asset) => sum + asset.marketCap, 0);
  const assets = top30.map((asset) => ({
    category: category,
    week: weekStart,
    symbol: asset.symbol,
    marketCap: asset.marketCap,
    weight: asset.marketCap / totalMarketCap,
  }));
  await top30assetsInsert(top30assets, assets);
  return assets;
}

// Simulate rebalancing and compute portfolio value
async function simulateRebalance(category, assets, weekStart) {
  const portfolio_value = [];
  const symbols = await fetchBinanceSymbols(category);
  // console.log(symbols);
  return;
  for (let asset of assets) {
    const priceData = await axios.get(
      `https://data.binance.vision/?prefix=data/spot/monthly/klines/ETHBTC/1s`
    );
    console.log(priceData);
    // const prices = priceData.data.map((p) => parseFloat(p[4])); // Closing prices

    // prices.forEach((price, i) => {
    //   if (!portfolio_value[i]) portfolio_value[i] = 0;
    //   portfolio_value[i] += asset.weight * price;
    // });
  }
  return;

  // Store portfolio values in the database
  const timestamps = prices.map((_, i) =>
    new Date(weekStart.getTime() + i * 1000).toISOString()
  );
  for (let i = 0; i < portfolio_value.length; i++) {
    await portfolioInsert(db, portfoliovalue, [
      { timestamp: timestamps[i], value: portfolio_value[i] },
    ]);
  }
}

// Generate candlesticks
async function generateCandlesticks(interval) {
  const values = await getPortfolioValue(db, portfoliovalue);

  const intervalMs = {
    "1m": 60 * 1000,
    "1h": 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
  }[interval];

  let candles = [];
  let current = [];
  let startTime = new Date(values[0].timestamp).getTime();

  for (let value of values) {
    const timestamp = new Date(value.timestamp).getTime();
    if (timestamp >= startTime + intervalMs) {
      candles.push({
        open: current[0],
        close: current[current.length - 1],
        high: Math.max(...current),
        low: Math.min(...current),
      });
      current = [];
      startTime += intervalMs;
    }
    current.push(value.value);
  }

  return candles;
}

// Example Usage
(async () => {
  const category = options.category;
  console.log(category);
  const weekStart = options.date;
  const assets = await fetchTop30Assets(category, weekStart);
  await simulateRebalance(category, assets, weekStart);

  //   const candles = await generateCandlesticks("1h");
  //   console.log(candles);
})();
