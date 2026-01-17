import { generateUUID } from "./helper.js";
import { prismaClient, validate } from "./util.js";
import { investmentValidation } from "./validation.js";

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
  const investment = validate(investmentValidation, request);
  investment.id = generateUUID();
  investment.userId = userID;

  return prismaClient.investment.create({
    data: investment,
    select: {
      id: true,
      userId: true,
      code: true,
      quantity: true,
      initialValuation: true,
      date: true,
      description: true,
    },
  });
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
  assetList,
};
