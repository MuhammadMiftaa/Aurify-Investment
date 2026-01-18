import { generateUUID } from "./helper.js";
import { prismaClient, validate } from "./util.js";
import {
  newInvestmentValidation,
  sellInvestmentValidation,
} from "./validation.js";

const investmentList = (userID) => {
  console.log("Fetching investment list for user:", userID);
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

const investmentCreate = (userID, request) => {
  console.log("Creating investment for user:", userID);
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
  console.log("Selling investment:", investmentId);
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
  investmentSold.deficit = investmentSold.sellPrice - investment.initialValuation;

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
        amount: investment.amount - investmentSold.quantity * investment.initialValuation,
      },
    }),
  ]);

  return investmentSoldCreate;
};

const assetList = () => {
  console.log("Fetching asset list");
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

export default {
  investmentList,
  investmentCreate,
  investmentSell,
  assetList,
};
