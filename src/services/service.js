import {
  EVENT_INVESTMENT_BUY,
  EVENT_INVESTMENT_SELL,
  fieldMap,
  MetalPriceAPI,
  validBaseCurrencies,
} from "../utils/constant.js";
import { validate } from "../utils/helper.js";
import { prismaClient } from "../utils/prisma.js";
import { publishWithRetry } from "../utils/queue.js";
import {
  newInvestmentValidation,
  sellInvestmentValidation,
} from "../validation/validation.js";
import https from "https";

const investmentList = () => {
  return prismaClient.investment.findMany({
    where: { deletedAt: null },
    include: { assetCode: true },
  });
};

const userInvestmentList = (userID) => {
  return prismaClient.investment.findMany({
    where: { userId: userID, deletedAt: null },
    include: { assetCode: true },
  });
};

const investmentDetail = (userID, investmentID) => {
  return prismaClient.investment.findUnique({
    where: { id: investmentID, userId: userID, deletedAt: null },
    include: { assetCode: true },
  });
};

const investmentCreate = async (userID, request) => {
  const investment = validate(newInvestmentValidation, request);

  investment.userId = userID;
  investment.initialValuation = investment.amount / investment.quantity;

  const created = await prismaClient.investment.create({
    data: investment,
    select: {
      id: true,
      userId: true,
      code: true,
      quantity: true,
      initialValuation: true,
      amount: true,
      date: true,
      description: true,
    },
  });

  // Publish event (non-blocking, tidak rollback jika gagal)
  publishWithRetry(EVENT_INVESTMENT_BUY, created).catch((err) => {
    logger.error("Failed to publish investment.created", {
      error: err.message,
      id: created.id,
    });
  });

  return created;
};

const investmentSell = async (userID, investmentId, request) => {
  const investmentSold = validate(sellInvestmentValidation, request);

  const investment = await prismaClient.investment.findUnique({
    where: { id: investmentId },
    select: { initialValuation: true, quantity: true, amount: true },
  });

  investmentSold.userId = userID;
  investmentSold.investmentId = investmentId;
  investmentSold.sellPrice = investmentSold.amount / investmentSold.quantity;
  investmentSold.deficit =
    investmentSold.sellPrice - investment.initialValuation;

  const [investmentSoldCreate] = await prismaClient.$transaction([
    prismaClient.investmentSold.create({
      data: investmentSold,
      select: {
        id: true,
        userId: true,
        investmentId: true,
        quantity: true,
        sellPrice: true,
        amount: true,
        date: true,
        description: true,
        deficit: true,
      },
    }),
    prismaClient.investment.update({
      where: { id: investmentId },
      data: {
        quantity: investment.quantity - investmentSold.quantity,
        amount:
          investment.amount -
          investmentSold.quantity * investment.initialValuation,
      },
    }),
  ]);

  // Publish event (non-blocking, tidak rollback jika gagal)
  publishWithRetry(EVENT_INVESTMENT_SELL, investmentSoldCreate).catch((err) => {
    logger.error("Failed to publish investment.sold", {
      error: err.message,
      id: investmentSoldCreate.id,
    });
  });

  return investmentSoldCreate;
};

const assetList = () => {
  return prismaClient.assetCode.findMany({
    where: { deletedAt: null },
    select: {
      code: true,
      name: true,
      unit: true,
      toUSD: true,
      toIDR: true,
      toEUR: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const assetRefresh = async (apiKey, baseCurrency = "USD", currencies) => {
  const base = baseCurrency.toUpperCase();

  if (!validBaseCurrencies.includes(base)) {
    throw new Error(
      `Invalid base currency. Must be one of: ${validBaseCurrencies.join(", ")}`,
    );
  }

  const response = await new Promise((resolve, reject) => {
    const req = https.request(
      `${MetalPriceAPI}/latest?api_key=${apiKey}&base=${base}&currencies=${currencies}`,
      { method: "GET" },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => resolve(rawData));
      },
    );

    req.on("error", reject);
    req.end();
  });

  const data = JSON.parse(response);

  if (!data.success) {
    throw new Error("Failed to fetch metal prices");
  }

  const priceField = fieldMap[base];
  const assetUpdates = [];

  for (const [key, rate] of Object.entries(data.rates)) {
    if (
      key.startsWith("USD") ||
      key.startsWith("IDR") ||
      key.startsWith("EUR")
    ) {
      continue;
    }

    const currencyKey = `${base}${key}`;
    let priceInBaseCurrency = null;

    if (data.rates[currencyKey]) {
      priceInBaseCurrency = data.rates[currencyKey];
    } else if (rate > 0) {
      priceInBaseCurrency = 1 / rate;
    }

    if (priceInBaseCurrency > 0) {
      assetUpdates.push(
        prismaClient.assetCode.updateMany({
          where: { code: key, deletedAt: null },
          data: { [priceField]: priceInBaseCurrency, updatedAt: new Date() },
        }),
      );
    }
  }

  if (assetUpdates.length > 0) {
    await prismaClient.$transaction(assetUpdates);
  }

  return { success: true, updated: assetUpdates.length, baseCurrency: base };
};

export default {
  investmentList,
  userInvestmentList,
  investmentDetail,
  investmentCreate,
  investmentSell,
  assetList,
  assetRefresh,
};
