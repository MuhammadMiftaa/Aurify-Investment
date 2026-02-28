import {
  MetalPriceAPIBasePayload,
  MetalPriceAPICurrencies,
} from "../utils/constant.js";
import env from "../utils/env.js";
import service from "../services/service.js";
import logger from "../utils/logger.js";
import {
  AssetService,
  InvestmentService,
  LogAssetRefreshFailed,
  LogAssetRefreshed,
  LogInvestmentCreateFailed,
  LogInvestmentCreated,
  LogInvestmentSellBadRequest,
  LogInvestmentSellFailed,
  LogInvestmentSold,
  REQUEST_ID_LOCAL_KEY,
} from "../utils/log.js";

// Maps service-layer error messages to HTTP status codes and safe client messages.
function mapServiceError(err) {
  const msg = err.message || "";
  if (msg.includes("not found")) {
    return [404, "resource not found"];
  }
  if (msg.includes("insufficient") || msg.includes("validation")) {
    return [422, "unprocessable request"];
  }
  if (msg.includes("invalid")) {
    return [400, "invalid request"];
  }
  return [500, "internal server error"];
}

// GET /investments — list investments for authenticated user (read-only, no success log needed)
const investmentList = async (req, res, next) => {
  try {
    const result = await service.userInvestmentList(req.user.id);

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Success retrieving investments",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /investments/:id — read-only, no success log needed
const investmentDetail = async (req, res, next) => {
  try {
    const result = await service.investmentDetail(req.user.id, req.params.id);

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Success retrieving investment detail",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /investments — write operation: log success + error
const investmentCreate = async (req, res, next) => {
  const requestID = req[REQUEST_ID_LOCAL_KEY];

  try {
    const result = await service.investmentCreate(req.user.id, req.body);

    logger.info(LogInvestmentCreated, {
      service: InvestmentService,
      request_id: requestID,
      investment_id: result.id,
      user_id: result.userId,
      asset_code: result.code,
    });

    res.status(201).json({
      status: true,
      statusCode: 201,
      message: "Success creating investment",
      data: result,
    });
  } catch (error) {
    if (error.isOperational && error.statusCode === 400) {
      logger.warn(LogInvestmentCreateFailed, {
        service: InvestmentService,
        request_id: requestID,
        error: error.message,
      });
    } else {
      logger.error(LogInvestmentCreateFailed, {
        service: InvestmentService,
        request_id: requestID,
        user_id: req.user.id,
        error: error.message,
      });
    }
    next(error);
  }
};

// POST /investments/:id — sell operation: log bad request, error, and success
const investmentSell = async (req, res, next) => {
  const requestID = req[REQUEST_ID_LOCAL_KEY];

  try {
    const result = await service.investmentSell(req.user.id, req.body);

    logger.info(LogInvestmentSold, {
      service: InvestmentService,
      request_id: requestID,
      user_id: req.user.id,
      asset_code: req.body.assetcode,
      quantity: req.body.quantity,
    });

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Success selling investment",
      data: result,
    });
  } catch (error) {
    if (error.isOperational && error.statusCode === 400) {
      logger.warn(LogInvestmentSellBadRequest, {
        service: InvestmentService,
        request_id: requestID,
        user_id: req.user.id,
        error: error.message,
      });
    } else {
      logger.error(LogInvestmentSellFailed, {
        service: InvestmentService,
        request_id: requestID,
        user_id: req.user.id,
        asset_code: req.body.assetcode,
        error: error.message,
      });
    }
    next(error);
  }
};

// GET /assets — read-only, no success log needed
const assetList = async (req, res, next) => {
  try {
    const result = await service.assetList();

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Success retrieving asset codes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /assets/refresh — write-like operation: log success and error
const assetRefresh = async (req, res, next) => {
  const requestID = req[REQUEST_ID_LOCAL_KEY];

  try {
    const result = await service.assetRefresh(
      env.METAL_PRICE_API_KEY,
      MetalPriceAPIBasePayload,
      MetalPriceAPICurrencies,
    );

    logger.info(LogAssetRefreshed, {
      service: AssetService,
      request_id: requestID,
      updated: result.updated,
      base_currency: result.baseCurrency,
    });

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: `Success refreshing ${result.updated} asset prices to ${result.baseCurrency}`,
      data: null,
    });
  } catch (error) {
    logger.error(LogAssetRefreshFailed, {
      service: AssetService,
      request_id: requestID,
      error: error.message,
    });
    next(error);
  }
};

export default {
  investmentList,
  investmentDetail,
  investmentCreate,
  investmentSell,
  assetList,
  assetRefresh,
};
