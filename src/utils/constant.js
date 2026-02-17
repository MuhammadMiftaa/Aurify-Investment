export const MetalPriceAPI = `https://api.metalpriceapi.com/v1`;
export const MetalPriceAPIBasePayload = `IDR`;
export const MetalPriceAPICurrencies = `XAG,XAU,XPD,XPT,ADA,BNB,BTC, DOGE,DOT,ETH,LINK,LTC,SOL,TRX,USDC,USDT,XRP`;
export const validBaseCurrencies = ["USD", "IDR", "EUR"];
export const fieldMap = {
  USD: "toUSD",
  IDR: "toIDR",
  EUR: "toEUR",
};

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: "Invalid credentials",
  TOKEN_REQUIRED: "Authentication token is required",
  TOKEN_INVALID: "Invalid or expired token",

  // Authorization
  FORBIDDEN: "You do not have permission to perform this action",
  ADMIN_ONLY: "This action is restricted to administrators only",

  // Orders
  ORDER_NOT_FOUND: "Order not found",
  INVALID_STATUS_TRANSITION: "Invalid status transition",
  CANNOT_UPDATE_OWN_ORDER_ONLY: "You can only update your own orders",

  // Validation
  VALIDATION_FAILED: "Validation failed",

  // Server
  INTERNAL_SERVER_ERROR: "Internal server error",
};

export const EXCHANGE_NAME = "refina_microservice";
export const EXCHANGE_TYPE = "topic";
export const EVENT_INVESTMENT_SELL = "investment.sell";
export const EVENT_INVESTMENT_BUY = "investment.buy";
export const EVENT_MAX_RETRIES = 5;
export const EVENT_DELAY_RETRY = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
