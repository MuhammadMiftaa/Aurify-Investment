import cron from "node-cron";
import service from "../services/service.js";
import {
  MetalPriceAPIBasePayload,
  MetalPriceAPICurrencies,
} from "./constant.js";
import env from "./env.js";
import logger from "./logger.js";
import {
  CronService,
  LogCronAssetRefreshFailed,
  LogCronAssetRefreshSuccess,
} from "./log.js";

cron.schedule("0 1 * * *", async () => {
  try {
    const result = await service.assetRefresh(
      env.METAL_PRICE_API_KEY,
      MetalPriceAPIBasePayload,
      MetalPriceAPICurrencies,
    );
    logger.info(LogCronAssetRefreshSuccess, {
      service: CronService,
      updated: result.updated,
      base_currency: result.baseCurrency,
    });
  } catch (error) {
    logger.error(LogCronAssetRefreshFailed, {
      service: CronService,
      error: error.message,
    });
  }
});
