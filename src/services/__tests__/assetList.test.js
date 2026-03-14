// ─────────────────────────────────────────────────────────────
// assetList.test.js
// Unit test untuk: assetList
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
const mockAssetFindMany = jest.fn();

jest.unstable_mockModule("../../utils/prisma.js", () => ({
  prismaClient: {
    investment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    investmentSold: { create: jest.fn() },
    assetCode: { findMany: mockAssetFindMany, updateMany: jest.fn() },
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

const FIXED_DATE = new Date("2025-01-01T00:00:00.000Z");

const sampleAsset = (code = "XAU") => ({
  code,
  name: "Gold",
  unit: "troy oz",
  toUSD: 1900.5,
  toIDR: 29000000,
  toEUR: 1750,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
});

const ASSET_SELECT_FIELDS = {
  code: true,
  name: true,
  unit: true,
  toUSD: true,
  toIDR: true,
  toEUR: true,
  createdAt: true,
  updatedAt: true,
};

// ─────────────────────────────────────────────
// Test Cases
// ─────────────────────────────────────────────

describe("assetList", () => {
  afterEach(() => jest.clearAllMocks());

  it("Success — returns all active assets", async () => {
    const assets = [sampleAsset("XAU"), sampleAsset("XAG")];
    mockAssetFindMany.mockResolvedValue(assets);

    const result = await service.assetList();

    expect(result).toHaveLength(2);
    expect(result[0].code).toBe("XAU");
    expect(result[1].code).toBe("XAG");
  });

  it("Success — queries with correct filter and select fields", async () => {
    mockAssetFindMany.mockResolvedValue([]);

    await service.assetList();

    expect(mockAssetFindMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      select: ASSET_SELECT_FIELDS,
    });
  });

  it("Success — returns empty list when no assets exist", async () => {
    mockAssetFindMany.mockResolvedValue([]);

    const result = await service.assetList();

    expect(result).toHaveLength(0);
    expect(mockAssetFindMany).toHaveBeenCalledTimes(1);
  });

  it("Success — each asset contains all required fields", async () => {
    mockAssetFindMany.mockResolvedValue([sampleAsset()]);

    const result = await service.assetList();
    const asset = result[0];

    expect(asset).toHaveProperty("code");
    expect(asset).toHaveProperty("name");
    expect(asset).toHaveProperty("unit");
    expect(asset).toHaveProperty("toUSD");
    expect(asset).toHaveProperty("toIDR");
    expect(asset).toHaveProperty("toEUR");
    expect(asset).toHaveProperty("createdAt");
    expect(asset).toHaveProperty("updatedAt");
  });

  it("Error — propagates database error", async () => {
    mockAssetFindMany.mockRejectedValue(new Error("connection timeout"));

    await expect(service.assetList()).rejects.toThrow("connection timeout");
  });
});
