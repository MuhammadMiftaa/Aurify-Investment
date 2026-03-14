// ─────────────────────────────────────────────────────────────
// investmentSell.test.js
// Unit test untuk: investmentSell
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
const mockInvestmentFindMany = jest.fn();
const mockTransaction = jest.fn();
const mockPublishWithRetry = jest.fn();

jest.unstable_mockModule("../../utils/prisma.js", () => ({
  prismaClient: {
    investment: {
      findMany: mockInvestmentFindMany,
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    investmentSold: { create: jest.fn() },
    assetCode: { findMany: jest.fn(), updateMany: jest.fn() },
    $transaction: mockTransaction,
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
  publishWithRetry: mockPublishWithRetry,
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
let NotFoundError;
let ValidationError;

beforeAll(async () => {
  ({ default: service } = await import("../../services/service.js"));
  ({ NotFoundError, ValidationError } = await import("../../utils/errors.js"));
});

// ─────────────────────────────────────────────
// Sample Data Factories
// ─────────────────────────────────────────────

const USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const INVESTMENT_ID_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const INVESTMENT_ID_2 = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const WALLET_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const FIXED_DATE = new Date("2025-01-01T00:00:00.000Z");

const sampleSellRequest = () => ({
  assetcode: "XAU",
  quantity: 1,
  amount: 2000000,
  date: FIXED_DATE,
  description: "Sell gold",
  walletId: WALLET_ID,
});

/** Buat investmentSold result yang dikembalikan $transaction */
const sampleInvestmentSoldResult = (investmentId = INVESTMENT_ID_1) => ({
  id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  userId: USER_ID,
  walletId: WALLET_ID,
  investmentId,
  quantity: 1,
  sellPrice: 2000000,
  amount: 2000000,
  date: FIXED_DATE,
  description: "Sell gold",
  deficit: 50000,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  investment: {
    assetCode: {
      code: "XAU",
      name: "Gold",
      unit: "troy oz",
      toUSD: 1900.5,
      toIDR: 29000000,
      toEUR: 1750,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
    },
  },
});

/** Helper — setup mock $transaction yang berhasil */
const mockSuccessfulTransaction = (
  soldResult = sampleInvestmentSoldResult(),
) => {
  mockTransaction.mockResolvedValue([soldResult]);
};

/** Helper — setup findMany dengan satu investment */
const mockFindOneInvestment = (override = {}) => {
  mockInvestmentFindMany.mockResolvedValue([
    {
      id: INVESTMENT_ID_1,
      initialValuation: 1950000,
      quantity: 2,
      amount: 3900000,
      ...override,
    },
  ]);
};

// ─────────────────────────────────────────────
// Test Cases
// ─────────────────────────────────────────────

describe("investmentSell", () => {
  afterEach(() => jest.clearAllMocks());

  // ── Happy Path ─────────────────────────────

  it("Success — sells investment and returns investmentSold array", async () => {
    mockFindOneInvestment();
    mockSuccessfulTransaction();
    mockPublishWithRetry.mockResolvedValue(undefined);

    const result = await service.investmentSell(USER_ID, sampleSellRequest());

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe(USER_ID);
    expect(result[0].walletId).toBe(WALLET_ID);
    expect(result[0].assetCode).toBeDefined();
    // investment field harus di-unwrap (tidak ada nested investment)
    expect(result[0].investment).toBeUndefined();
  });

  it("Success — investmentSold has assetCode directly from nested investment", async () => {
    mockFindOneInvestment();
    mockSuccessfulTransaction();
    mockPublishWithRetry.mockResolvedValue(undefined);

    const result = await service.investmentSell(USER_ID, sampleSellRequest());

    expect(result[0].assetCode.code).toBe("XAU");
    expect(result[0].assetCode.name).toBe("Gold");
  });

  it("Success — sells across multiple investments (FIFO order)", async () => {
    // 2 investment masing-masing quantity 1, jual 2
    mockInvestmentFindMany.mockResolvedValue([
      {
        id: INVESTMENT_ID_1,
        initialValuation: 1900000,
        quantity: 1,
        amount: 1900000,
      },
      {
        id: INVESTMENT_ID_2,
        initialValuation: 1950000,
        quantity: 1,
        amount: 1950000,
      },
    ]);
    const sold1 = sampleInvestmentSoldResult(INVESTMENT_ID_1);
    const sold2 = sampleInvestmentSoldResult(INVESTMENT_ID_2);
    mockTransaction
      .mockResolvedValueOnce([sold1])
      .mockResolvedValueOnce([sold2]);
    mockPublishWithRetry.mockResolvedValue(undefined);

    const req = { ...sampleSellRequest(), quantity: 2, amount: 4000000 };
    const result = await service.investmentSell(USER_ID, req);

    expect(result).toHaveLength(2);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it("Success — publishWithRetry called with EVENT_INVESTMENT_SELL", async () => {
    mockFindOneInvestment();
    mockSuccessfulTransaction();
    mockPublishWithRetry.mockResolvedValue(undefined);

    const result = await service.investmentSell(USER_ID, sampleSellRequest());

    await Promise.resolve();
    expect(mockPublishWithRetry).toHaveBeenCalledWith(
      "investment.sell",
      expect.any(Array),
    );
    expect(result).toHaveLength(1);
  });

  it("Success — publish failure does not affect sell result", async () => {
    mockFindOneInvestment();
    mockSuccessfulTransaction();
    mockPublishWithRetry.mockRejectedValue(new Error("broker down"));

    const result = await service.investmentSell(USER_ID, sampleSellRequest());

    expect(result).toHaveLength(1);
  });

  it("Success — partial sell processes all from one investment", async () => {
    // Investment punya quantity 5, jual 3
    mockInvestmentFindMany.mockResolvedValue([
      {
        id: INVESTMENT_ID_1,
        initialValuation: 2000000,
        quantity: 5,
        amount: 10000000,
      },
    ]);
    mockSuccessfulTransaction();
    mockPublishWithRetry.mockResolvedValue(undefined);

    const req = { ...sampleSellRequest(), quantity: 3, amount: 6000000 };
    const result = await service.investmentSell(USER_ID, req);

    // Hanya 1 transaksi (semua dari satu investment)
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });

  // ── Not Found Error ─────────────────────────

  it("Error — throws NotFoundError when no investment found for assetcode", async () => {
    mockInvestmentFindMany.mockResolvedValue([]);

    await expect(
      service.investmentSell(USER_ID, sampleSellRequest()),
    ).rejects.toThrow(NotFoundError);

    await expect(
      service.investmentSell(USER_ID, sampleSellRequest()),
    ).rejects.toThrow("Investment not found");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  // ── Insufficient Quantity Error ─────────────

  it("Error — throws ValidationError when total quantity insufficient", async () => {
    // Total quantity = 1, tapi ingin jual 5
    mockFindOneInvestment({ quantity: 1 });

    const req = { ...sampleSellRequest(), quantity: 5 };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow(
      ValidationError,
    );
    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow(
      "Insufficient investment quantity",
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("Error — throws ValidationError when investments have zero quantity", async () => {
    mockInvestmentFindMany.mockResolvedValue([
      {
        id: INVESTMENT_ID_1,
        initialValuation: 1900000,
        quantity: 0,
        amount: 0,
      },
    ]);

    const req = { ...sampleSellRequest(), quantity: 1 };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow(
      ValidationError,
    );
  });

  // ── Validation Error ────────────────────────

  it("Error — missing required field 'assetcode' throws validation error", async () => {
    const req = { ...sampleSellRequest(), assetcode: undefined };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow();
    expect(mockInvestmentFindMany).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'quantity' throws validation error", async () => {
    const req = { ...sampleSellRequest(), quantity: undefined };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow();
    expect(mockInvestmentFindMany).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'amount' throws validation error", async () => {
    const req = { ...sampleSellRequest(), amount: undefined };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow();
    expect(mockInvestmentFindMany).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'walletId' throws validation error", async () => {
    const req = { ...sampleSellRequest(), walletId: undefined };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow();
    expect(mockInvestmentFindMany).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'date' throws validation error", async () => {
    const req = { ...sampleSellRequest(), date: undefined };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow();
    expect(mockInvestmentFindMany).not.toHaveBeenCalled();
  });

  it("Error — negative quantity throws validation error", async () => {
    const req = { ...sampleSellRequest(), quantity: -1 };

    await expect(service.investmentSell(USER_ID, req)).rejects.toThrow();
    expect(mockInvestmentFindMany).not.toHaveBeenCalled();
  });

  // ── Database Error ───────────────────────────

  it("Error — findMany failure propagates error", async () => {
    mockInvestmentFindMany.mockRejectedValue(new Error("db error"));

    await expect(
      service.investmentSell(USER_ID, sampleSellRequest()),
    ).rejects.toThrow("db error");
  });

  it("Error — $transaction failure propagates error", async () => {
    mockFindOneInvestment();
    mockTransaction.mockRejectedValue(new Error("transaction failed"));

    await expect(
      service.investmentSell(USER_ID, sampleSellRequest()),
    ).rejects.toThrow("transaction failed");
  });
});
