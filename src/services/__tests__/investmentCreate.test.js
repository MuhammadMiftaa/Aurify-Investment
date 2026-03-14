// ─────────────────────────────────────────────────────────────
// investmentCreate.test.js
// Unit test untuk: investmentCreate
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
const mockCreate = jest.fn();
const mockPublishWithRetry = jest.fn();

jest.unstable_mockModule("../../utils/prisma.js", () => ({
  prismaClient: {
    investment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: mockCreate,
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

beforeAll(async () => {
  ({ default: service } = await import("../../services/service.js"));
});

// ─────────────────────────────────────────────
// Sample Data Factories
// ─────────────────────────────────────────────

const USER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const INVESTMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const WALLET_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const FIXED_DATE = new Date("2025-01-01T00:00:00.000Z");

const sampleCreateRequest = () => ({
  code: "XAU",
  quantity: 2,
  amount: 1900000,
  date: FIXED_DATE,
  description: "Gold investment",
  walletId: WALLET_ID,
});

const sampleCreatedInvestment = () => ({
  id: INVESTMENT_ID,
  userId: USER_ID,
  code: "XAU",
  quantity: 2,
  initialValuation: 950000,
  amount: 1900000,
  date: FIXED_DATE,
  description: "Gold investment",
  walletId: WALLET_ID,
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
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
});

// ─────────────────────────────────────────────
// Test Cases
// ─────────────────────────────────────────────

describe("investmentCreate", () => {
  afterEach(() => jest.clearAllMocks());

  // ── Happy Path ─────────────────────────────

  it("Success — creates investment and fires publish event", async () => {
    const created = sampleCreatedInvestment();
    mockCreate.mockResolvedValue(created);
    mockPublishWithRetry.mockResolvedValue(undefined);

    const result = await service.investmentCreate(
      USER_ID,
      sampleCreateRequest(),
    );

    expect(result.id).toBe(INVESTMENT_ID);
    expect(result.userId).toBe(USER_ID);
    expect(result.initialValuation).toBe(950000); // amount / quantity
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("Success — initialValuation is calculated from amount/quantity", async () => {
    const req = { ...sampleCreateRequest(), amount: 3000000, quantity: 3 };
    const created = { ...sampleCreatedInvestment(), initialValuation: 1000000 };
    mockCreate.mockResolvedValue(created);
    mockPublishWithRetry.mockResolvedValue(undefined);

    await service.investmentCreate(USER_ID, req);

    // Verify prisma.create dipanggil dengan initialValuation yang benar
    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.data.initialValuation).toBe(1000000); // 3000000 / 3
  });

  it("Success — userId is injected from parameter, not from request", async () => {
    const created = sampleCreatedInvestment();
    mockCreate.mockResolvedValue(created);
    mockPublishWithRetry.mockResolvedValue(undefined);

    await service.investmentCreate(USER_ID, sampleCreateRequest());

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.data.userId).toBe(USER_ID);
  });

  it("Success — publishWithRetry is called with EVENT_INVESTMENT_BUY", async () => {
    const created = sampleCreatedInvestment();
    mockCreate.mockResolvedValue(created);
    mockPublishWithRetry.mockResolvedValue(undefined);

    await service.investmentCreate(USER_ID, sampleCreateRequest());

    await Promise.resolve();
    expect(mockPublishWithRetry).toHaveBeenCalledWith(
      "investment.buy",
      created,
    );
  });

  it("Success — publish failure does not affect create result", async () => {
    const created = sampleCreatedInvestment();
    mockCreate.mockResolvedValue(created);
    // publish gagal — service tetap return sukses
    mockPublishWithRetry.mockRejectedValue(new Error("broker down"));

    const result = await service.investmentCreate(
      USER_ID,
      sampleCreateRequest(),
    );

    expect(result.id).toBe(INVESTMENT_ID);
  });

  // ── Validation Error ────────────────────────

  it("Error — missing required field 'code' throws validation error", async () => {
    const req = { ...sampleCreateRequest(), code: undefined };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'quantity' throws validation error", async () => {
    const req = { ...sampleCreateRequest(), quantity: undefined };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'amount' throws validation error", async () => {
    const req = { ...sampleCreateRequest(), amount: undefined };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'date' throws validation error", async () => {
    const req = { ...sampleCreateRequest(), date: undefined };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Error — missing required field 'walletId' throws validation error", async () => {
    const req = { ...sampleCreateRequest(), walletId: undefined };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Error — negative quantity throws validation error", async () => {
    const req = { ...sampleCreateRequest(), quantity: -1 };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Error — unknown field in request throws validation error", async () => {
    const req = { ...sampleCreateRequest(), unknownField: "value" };

    await expect(service.investmentCreate(USER_ID, req)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── Database Error ───────────────────────────

  it("Error — database create failure propagates error", async () => {
    mockCreate.mockRejectedValue(new Error("unique constraint violation"));

    await expect(
      service.investmentCreate(USER_ID, sampleCreateRequest()),
    ).rejects.toThrow("unique constraint violation");
  });
});
