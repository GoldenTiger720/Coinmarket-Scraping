import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/sqlite-core";

export const coinmarketcap = sqliteTable(
  "coinmarketcap",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    category: text("category_name").notNull(),
    ticker: text("ticker").notNull(),
    market_cap: real("market_cap").notNull(),
    // timestamp: integer("timestamp").notNull(),
  },
  (table) => ({
    // timestampIdx: index("coinmarketcap_timestamp_idx").on(table.timestamp),
  })
);

export const spot = sqliteTable(
  "spot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    interval: text("interval").notNull(),
    timestamp: text("timestamp").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    volume: real("volume").notNull(),
  },
  (table) => ({
    symbolIdx: index("spot_symbol_idx").on(table.symbol),
    timestampIdx: index("spot_timestamp_idx").on(table.timestamp),
    intervalIdx: index("spot_interval_idx").on(table.interval),
    uniqueSymbolTimestamp: uniqueIndex("spot_symbol_timestamp_unique").on(
      table.symbol,
      table.timestamp
    ),
  })
);

export const week_cap = sqliteTable(
  "week_cap",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    interval: text("interval").notNull(),
    timestamp: integer("timestamp").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    market_cap: real("market_cap").notNull(),
  },
  (table) => ({
    symbolIdx: index("week_cap_symbol_idx").on(table.symbol),
    timestampIdx: index("week_cap_timestamp_idx").on(table.timestamp),
    intervalIdx: index("week_cap_interval_idx").on(table.interval),
  })
);

export const top30assets = sqliteTable(
  "top30assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    category: text("category").notNull(),
    week: text("week").notNull(),
    symbol: text("symbol").notNull(),
    marketCap: real("marketCap").notNull(),
    weight: real("weight").notNull(),
  },
  (table) => ({
    symbolIdx: index("top30assets_symbol_idx").on(table.symbol),
  })
);

export const portfoliovalue = sqliteTable(
  "portfoliovalue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    timestamp: integer("timestamp").notNull(),
    value: real("value").notNull(),
  },
  (table) => ({
    timestampIdx: index("portfoliovalue_timestamp_idx").on(table.timestamp),
  })
);

export const pools = sqliteTable(
  "pools",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull().default("UniswapV3_ETH"), // UniswapV3_ETH | Thena_BSC
    address: text("address").notNull().unique(),
    token0Symbol: text("token0Symbol").notNull(),
    token1Symbol: text("token1Symbol").notNull(),
    token0Decimals: integer("token0Decimals").notNull(),
    token1Decimals: integer("token1Decimals").notNull(),
    feeTier: text("feeTier"),
    created: integer("created").notNull(),
  },
  (table) => ({
    createdIdx: index("pools_created_idx").on(table.created),
  })
);

export const trades = sqliteTable(
  "trades",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    txid: text("txid").notNull(),
    timestamp: integer("timestamp").notNull(),
    pool_id: integer("pool_id").references(() => pools.id),
    amount0: text("amount0").notNull(),
    amount1: text("amount1").notNull(),
    amountUSD: text("amountUSD").notNull(),
    sqrtPriceX96: integer("sqrtPriceX96").notNull(),
    tick: text("tick").notNull(),
  },
  (table) => ({
    timestampIdx: index("trades_timestamp_idx").on(table.timestamp),
    sqrtPriceX96Idx: index("trades_sqrtPriceX96_idx").on(table.sqrtPriceX96),
  })
);

export const liquidity = sqliteTable(
  "liquidity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pool_id: integer("pool_id")
      .references(() => pools.id)
      .notNull(),
    timestamp: integer("timestamp").notNull(),
    liquidity: integer("liquidity").notNull(),
  },
  (table) => ({
    liquidityUniquePoolIdTimestamp: uniqueIndex(
      "liquidity_unique_pool_id_timestamp"
    ).on(table.pool_id, table.timestamp),
    timestampIdx: index("liquidity_timestamp_idx").on(table.timestamp),
  })
);

export const fee_tiers = sqliteTable(
  "fee_tiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pool_id: integer("pool_id")
      .references(() => pools.id)
      .notNull(),
    timestamp: integer("timestamp").notNull(),
    feeTier: integer("feeTier").notNull(),
  },
  (table) => ({
    feeTiersUniquePoolIdTimestamp: uniqueIndex(
      "fee_tiers_unique_pool_id_timestamp"
    ).on(table.pool_id, table.timestamp),
    timestampIdx: index("fee_tiers_timestamp_idx").on(table.timestamp),
  })
);

export const volatility = sqliteTable(
  "volatility",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pool_id: integer("pool_id")
      .references(() => pools.id)
      .notNull(),
    timestamp: integer("timestamp").notNull(),
    realizedVolatility: integer("realizedVolatility").notNull(),
  },
  (table) => ({
    volatilityUniquePoolIdTimestamp: uniqueIndex(
      "volatility_unique_pool_id_timestamp"
    ).on(table.pool_id, table.timestamp),
    timestampIdx: index("volatility_timestamp_idx").on(table.timestamp),
  })
);

export const iv_hist = sqliteTable(
  "iv_hist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    symbol: text("symbol").notNull(),
    resolution: text("resolution").notNull(),
    timestamp: integer("timestamp").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
  },
  (table) => ({
    symbolIdx: index("iv_hist_symbol_idx").on(table.symbol),
    timestampIdx: index("iv_hist_timestamp_idx").on(table.timestamp),
    resolutionIdx: index("iv_hist_resolution_idx").on(table.resolution),
    uniqueSymbolTimestampResolution: uniqueIndex(
      "iv_hist_symbol_timestamp_resolution_unique"
    ).on(table.symbol, table.timestamp, table.resolution),
  })
);
