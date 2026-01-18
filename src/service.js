import { fieldMap, MetalPriceAPI, validBaseCurrencies } from "./const.js";
import { generateUUID } from "./helper.js";
import { prismaClient, validate } from "./util.js";
import {
  newInvestmentValidation,
  sellInvestmentValidation,
} from "./validation.js";
import https from "https";

const investmentList = (userID) => {
  return prismaClient.investment.findMany({
    where: {
      userId: userID,
      deletedAt: null,
    },
    include: {
      assetCode: true,
    },
  });
};

const investmentDetail = (userID, investmentID) => {
  return prismaClient.investment.findUnique({
    where: {
      id: investmentID,
      userId: userID,
      deletedAt: null,
    },
    include: {
      assetCode: true,
    },
  });
};

const investmentCreate = (userID, request) => {
  const investment = validate(newInvestmentValidation, request);

  investment.id = generateUUID();
  investment.userId = userID;
  investment.initialValuation = investment.amount / investment.quantity;

  return prismaClient.investment.create({
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
};

const investmentSell = async (userID, investmentId, request) => {
  const investmentSold = validate(sellInvestmentValidation, request);

  const investment = await prismaClient.investment.findUnique({
    where: {
      id: investmentId,
    },
    select: {
      initialValuation: true,
      quantity: true,
      amount: true,
    },
  });

  investmentSold.id = generateUUID();
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
      where: {
        id: investmentId,
      },
      data: {
        quantity: investment.quantity - investmentSold.quantity,
        amount:
          investment.amount -
          investmentSold.quantity * investment.initialValuation,
      },
    }),
  ]);

  return investmentSoldCreate;
};

const assetList = () => {
  return prismaClient.assetCode.findMany({
    where: {
      deletedAt: null,
    },
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
          data: {
            [priceField]: priceInBaseCurrency,
            updatedAt: new Date(),
          },
        }),
      );
    }
  }

  if (assetUpdates.length > 0) {
    await prismaClient.$transaction(assetUpdates);
  }

  return {
    success: true,
    updated: assetUpdates.length,
    baseCurrency: base,
  };
};

export default {
  investmentList,
  investmentDetail,
  investmentCreate,
  investmentSell,
  assetList,
  assetRefresh,
};
