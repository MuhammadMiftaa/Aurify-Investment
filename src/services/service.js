import {
  EVENT_INVESTMENT_BUY,
  EVENT_INVESTMENT_SELL,
  fieldMap,
  MetalPriceAPI,
  validBaseCurrencies,
} from "../utils/constant.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { validate } from "../utils/helper.js";
import logger from "../utils/logger.js";
import {
  InvestmentService,
  LogInvestmentEventPublishFailed,
  LogInvestmentSoldEventPublishFailed,
} from "../utils/log.js";
import { prismaClient } from "../utils/prisma.js";
import { publishWithRetry } from "../utils/queue.js";
import {
  newInvestmentValidation,
  sellInvestmentValidation,
} from "../validation/validation.js";
import https from "https";

const investmentList = () => {
  return prismaClient.investment.findMany({
    where: { quantity: { gt: 0 }, deletedAt: null },
    include: { assetCode: true },
  });
};

const userInvestmentList = (userID) => {
  return prismaClient.investment.findMany({
    where: { userId: userID, quantity: { gt: 0 }, deletedAt: null },
    include: { assetCode: true },
  });
};

const investmentDetail = (userID, investmentID) => {
  return prismaClient.investment.findUnique({
    where: {
      id: investmentID,
      userId: userID,
      quantity: { gt: 0 },
      deletedAt: null,
    },
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
      walletId: true,
      createdAt: true,
      updatedAt: true,
      assetCode: {
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
      },
    },
  });

  publishWithRetry(EVENT_INVESTMENT_BUY, created).catch((err) => {
    logger.error(LogInvestmentEventPublishFailed, {
      service: InvestmentService,
      investment_id: created.id,
      event_type: EVENT_INVESTMENT_BUY,
      error: err.message,
    });
  });

  return created;
};

const investmentSell = async (userID, request) => {
  const body = validate(sellInvestmentValidation, request);

  const investments = await prismaClient.investment.findMany({
    where: { code: body.assetcode, quantity: { gt: 0 }, deletedAt: null },
    select: { id: true, initialValuation: true, quantity: true, amount: true },
    orderBy: { createdAt: "asc" },
  });

  if (investments.length === 0) {
    throw new NotFoundError("Investment not found");
  }

  const totalQuantity = investments.reduce(
    (acc, inv) => acc + Number(inv.quantity),
    0,
  );
  if (totalQuantity < body.quantity) {
    throw new ValidationError("Insufficient investment quantity");
  }

  const sellPricePerUnit = body.amount / body.quantity;
  const investmentSold = [];
  let quantityLeftToSell = body.quantity;

  for (const investment of investments) {
    if (quantityLeftToSell <= 0) break;

    const quantitySoldFromThis = Math.min(
      Number(investment.quantity),
      quantityLeftToSell,
    );

    const amountSoldFromThis = quantitySoldFromThis * sellPricePerUnit;
    const deficit = sellPricePerUnit - Number(investment.initialValuation);

    const [investmentSoldCreate] = await prismaClient.$transaction([
      prismaClient.investmentSold.create({
        data: {
          userId: userID,
          walletId: body.walletId,
          investment: { connect: { id: investment.id } },
          quantity: quantitySoldFromThis,
          sellPrice: sellPricePerUnit,
          amount: amountSoldFromThis,
          date: body.date,
          description: body.description,
          deficit: deficit,
        },
        select: {
          id: true,
          userId: true,
          walletId: true,
          investmentId: true,
          quantity: true,
          sellPrice: true,
          amount: true,
          date: true,
          description: true,
          deficit: true,
          createdAt: true,
          updatedAt: true,
          investment: {
            select: {
              assetCode: {
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
              },
            },
          },
        },
      }),
      prismaClient.investment.update({
        where: { id: investment.id },
        data: {
          quantity: { decrement: quantitySoldFromThis },
          amount: {
            decrement:
              quantitySoldFromThis * Number(investment.initialValuation),
          },
        },
      }),
    ]);

    investmentSold.push({
      ...investmentSoldCreate,
      assetCode: { ...investmentSoldCreate.investment.assetCode },
      investment: undefined,
    });
    quantityLeftToSell -= quantitySoldFromThis;
  }

  publishWithRetry(EVENT_INVESTMENT_SELL, investmentSold).catch((err) => {
    logger.error(LogInvestmentSoldEventPublishFailed, {
      service: InvestmentService,
      event_type: EVENT_INVESTMENT_SELL,
      error: err.message,
    });
  });

  return investmentSold;
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
