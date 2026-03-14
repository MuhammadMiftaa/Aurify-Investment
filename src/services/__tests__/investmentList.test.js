// ─────────────────────────────────────────────────────────────
// investmentList.test.js
// Unit test untuk: investmentList, userInvestmentList, investmentDetail
// ─────────────────────────────────────────────────────────────
//
// ESM mock pattern:
//  1. jest.unstable_mockModule() HARUS dipanggil sebelum import()
//  2. Semua import dilakukan secara dynamic di dalam beforeAll()
// ─────────────────────────────────────────────────────────────

import {
  jest,
  describe,
  it,
  beforeAll,
  afterEach,
  expect,
} from "@jest/globals";

// ─── Mock Declarations ───────────────────────────────────────
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();

jest.unstable_mockModule("../../utils/prisma.js", () => ({
  prismaClient: {
    investment: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: jest.fn(),
      update: jest.fn(),
    },
    investmentSold: { create: jest.fn() },
    assetCode: { findMany: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/logger.js", () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/queue.js", () => ({
  publishWithRetry: jest.fn(),
}));

jest.unstable_mockModule("../../utils/env.js", () => ({
  default: {
    DATABASE_URL: "postgresql://test",
    DB_MAX_OPEN_CONN: 10,
    DB_MIN_IDLE_CONN: 2,
    DB_IDLE_TIMEOUT_MS: 10000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
    LOG_LEVEL: "error",
  },
}));

// ─── Dynamic Imports ─────────────────────────────────────────
let service;

beforeAll(async () => {
  ({ default: service } = await import("../../services/service.js"));
});

// ─────────────────────────────────────────────
// Sample Data Factories
// ─────────────────────────────────────────────

const INVESTMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const FIXED_DATE = new Date("2025-01-01T00:00:00.000Z");

const sampleAssetCode = () => ({
  code: "XAU",
  name: "Gold",
  unit: "troy oz",
  toUSD: 1900.5,
  toIDR: 29000000,
  toEUR: 1750,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
});

const sampleInvestment = () => ({
  id: INVESTMENT_ID,
  userId: USER_ID,
  code: "XAU",
  quantity: 2,
  initialValuation: 950000,
  amount: 1900000,
  date: FIXED_DATE,
  description: "Gold investment",
  walletId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  deletedAt: null,
  assetCode: sampleAssetCode(),
});

// ─────────────────────────────────────────────
// investmentList
// ─────────────────────────────────────────────

describe("investmentList", () => {
  afterEach(() => jest.clearAllMocks());

  it("Success — returns all investments with quantity > 0", async () => {
    const investments = [sampleInvestment()];
    mockFindMany.mockResolvedValue(investments);

    const result = await service.investmentList();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(INVESTMENT_ID);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { quantity: { gt: 0 }, deletedAt: null },
      include: { assetCode: true },
    });
  });

  it("Success — returns empty list when no investments exist", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await service.investmentList();

    expect(result).toHaveLength(0);
    expect(mockFindMany).toHaveBeenCalledTimes(1);
  });

  it("Error — propagates database error", async () => {
    mockFindMany.mockRejectedValue(new Error("db error"));

    await expect(service.investmentList()).rejects.toThrow("db error");
  });
});

// ─────────────────────────────────────────────
// userInvestmentList
// ─────────────────────────────────────────────

describe("userInvestmentList", () => {
  afterEach(() => jest.clearAllMocks());

  it("Success — returns investments for specific user", async () => {
    const investments = [sampleInvestment()];
    mockFindMany.mockResolvedValue(investments);

    const result = await service.userInvestmentList(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(USER_ID);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, quantity: { gt: 0 }, deletedAt: null },
      include: { assetCode: true },
    });
  });

  it("Success — returns empty list when user has no investments", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await service.userInvestmentList(USER_ID);

    expect(result).toHaveLength(0);
  });

  it("Error — propagates database error", async () => {
    mockFindMany.mockRejectedValue(new Error("connection refused"));

    await expect(service.userInvestmentList(USER_ID)).rejects.toThrow(
      "connection refused",
    );
  });
});

// ─────────────────────────────────────────────
// investmentDetail
// ─────────────────────────────────────────────

describe("investmentDetail", () => {
  afterEach(() => jest.clearAllMocks());

  it("Success — returns investment detail for user and id", async () => {
    const investment = sampleInvestment();
    mockFindUnique.mockResolvedValue(investment);

    const result = await service.investmentDetail(USER_ID, INVESTMENT_ID);

    expect(result.id).toBe(INVESTMENT_ID);
    expect(result.userId).toBe(USER_ID);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        id: INVESTMENT_ID,
        userId: USER_ID,
        quantity: { gt: 0 },
        deletedAt: null,
      },
      include: { assetCode: true },
    });
  });

  it("Success — returns null when investment not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await service.investmentDetail(USER_ID, "non-existent-id");

    expect(result).toBeNull();
  });

  it("Error — propagates database error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db error"));

    await expect(
      service.investmentDetail(USER_ID, INVESTMENT_ID),
    ).rejects.toThrow("db error");
  });
});
