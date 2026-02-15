import cron from "node-cron";
import service from "../services/service.js";
import { MetalPriceAPIBasePayload, MetalPriceAPICurrencies } from "./constant.js";
import env from "./env.js";

cron.schedule("0 1 * * *", async () => {
  // Refresh asset prices daily at midnight
  try {
    const result = await service.assetRefresh(
      env.METAL_PRICE_API_KEY,
      MetalPriceAPIBasePayload,
      MetalPriceAPICurrencies,
    );
    console.info(
      `Success refreshing ${result.updated} asset prices to ${result.baseCurrency} at ${new Date().toISOString()}`,
    );
  } catch (error) {
    console.info(`Error refreshing asset prices: ${error.message}`);
  }
});
