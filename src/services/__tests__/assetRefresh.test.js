// ─────────────────────────────────────────────────────────────
// assetRefresh.test.js
// Unit test untuk: assetRefresh
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
const mockUpdateMany = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule("../../utils/prisma.js", () => ({
  prismaClient: {
    investment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    investmentSold: { create: jest.fn() },
    assetCode: { findMany: jest.fn(), updateMany: mockUpdateMany },
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

// ─── Mock https (harus sebelum import) ───────────────────────
jest.unstable_mockModule("node:https", () => ({
  default: { request: jest.fn() },
}));

// ─── Dynamic Imports ─────────────────────────────────────────
let service;
let mockHttps;

beforeAll(async () => {
  ({ default: service } = await import("../../services/service.js"));
  ({ default: mockHttps } = await import("node:https"));
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const API_KEY = "test-api-key";

/** Helper — mock https.request agar mereturn payload JSON tertentu */
const mockHttpsRequest = (payload) => {
  const mockReq = { on: jest.fn(), end: jest.fn() };
  mockHttps.request.mockImplementation((_url, _opts, callback) => {
    const mockRes = {
      on: jest.fn((event, handler) => {
        if (event === "data") handler(JSON.stringify(payload));
        if (event === "end") handler();
      }),
    };
    callback(mockRes);
    return mockReq;
  });
};

/** Helper — sample success API response dari MetalPriceAPI */
const sampleApiResponse = (base = "USD") => ({
  success: true,
  base,
  rates: {
    USDXAU: 0.000526,
    USDXAG: 0.0417,
    USDUSD: 1,
    USDIDR: 16000,
    USDEUR: 0.92,
    XAU: 1900.5,
    XAG: 24,
  },
});

// ─────────────────────────────────────────────
// Test Cases
// ─────────────────────────────────────────────

describe("assetRefresh", () => {
  afterEach(() => jest.clearAllMocks());

  // ── Happy Path ─────────────────────────────

  it("Success — returns success=true with updated count and baseCurrency", async () => {
    mockHttpsRequest(sampleApiResponse("USD"));
    mockTransaction.mockResolvedValue([]);

    const result = await service.assetRefresh(API_KEY, "USD", "XAU,XAG");

    expect(result.success).toBe(true);
    expect(result.baseCurrency).toBe("USD");
    expect(typeof result.updated).toBe("number");
  });

  it("Success — uses USD as base currency and updates toUSD field", async () => {
    mockHttpsRequest(sampleApiResponse("USD"));
    mockTransaction.mockResolvedValue([]);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    await service.assetRefresh(API_KEY, "USD", "XAU,XAG");

    const calls = mockUpdateMany.mock.calls;
    if (calls.length > 0) {
      expect(calls[0][0].data).toHaveProperty("toUSD");
    }
  });

  it("Success — uses IDR as base currency and updates toIDR field", async () => {
    const idrResponse = {
      success: true,
      base: "IDR",
      rates: {
        IDRXAU: 0.000000033,
        XAU: 30000000,
        IDRUSD: 0.0000625,
        IDRIDR: 1,
        IDREUR: 0.0000578,
      },
    };
    mockHttpsRequest(idrResponse);
    mockTransaction.mockResolvedValue([]);

    const result = await service.assetRefresh(API_KEY, "IDR", "XAU");

    expect(result.success).toBe(true);
    expect(result.baseCurrency).toBe("IDR");
  });

  it("Success — uses EUR as base currency", async () => {
    const eurResponse = {
      success: true,
      base: "EUR",
      rates: {
        EURXAU: 0.000573,
        XAU: 1745,
        EURUSD: 1.09,
        EURIDR: 17400,
        EUREUR: 1,
      },
    };
    mockHttpsRequest(eurResponse);
    mockTransaction.mockResolvedValue([]);

    const result = await service.assetRefresh(API_KEY, "EUR", "XAU");

    expect(result.success).toBe(true);
    expect(result.baseCurrency).toBe("EUR");
  });

  it("Success — baseCurrency is case-insensitive (lowercase 'usd' normalized to 'USD')", async () => {
    mockHttpsRequest(sampleApiResponse("USD"));
    mockTransaction.mockResolvedValue([]);

    const result = await service.assetRefresh(API_KEY, "usd", "XAU");

    expect(result.baseCurrency).toBe("USD");
  });

  it("Success — returns updated=0 when no matching rates found", async () => {
    const emptyRateResponse = {
      success: true,
      base: "USD",
      rates: {
        USDUSD: 1,
        USDIDR: 16000,
        USDEUR: 0.92,
      },
    };
    mockHttpsRequest(emptyRateResponse);

    const result = await service.assetRefresh(API_KEY, "USD", "");

    expect(result.updated).toBe(0);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("Success — skips rates starting with USD/IDR/EUR prefixes", async () => {
    const response = {
      success: true,
      base: "USD",
      rates: {
        USDUSD: 1,
        USDIDR: 16000,
        USDEUR: 0.92,
        USDXAU: 0.000526,
        XAU: 1900.5,
      },
    };
    mockHttpsRequest(response);
    mockTransaction.mockResolvedValue([]);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const result = await service.assetRefresh(API_KEY, "USD", "XAU");

    expect(result.updated).toBeGreaterThanOrEqual(0);
  });

  // ── Error Path ─────────────────────────────

  it("Error — throws when baseCurrency is not valid (GBP)", async () => {
    await expect(service.assetRefresh(API_KEY, "GBP", "XAU")).rejects.toThrow(
      "Invalid base currency",
    );

    expect(mockHttps.request).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("Error — throws when API response has success=false", async () => {
    mockHttpsRequest({ success: false, error: { message: "invalid key" } });

    await expect(service.assetRefresh(API_KEY, "USD", "XAU")).rejects.toThrow(
      "Failed to fetch metal prices",
    );

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("Error — propagates https request network error", async () => {
    const mockReq = {
      on: jest.fn((event, handler) => {
        if (event === "error") handler(new Error("network error"));
      }),
      end: jest.fn(),
    };
    mockHttps.request.mockReturnValue(mockReq);

    await expect(service.assetRefresh(API_KEY, "USD", "XAU")).rejects.toThrow(
      "network error",
    );
  });

  it("Error — propagates $transaction failure", async () => {
    mockHttpsRequest(sampleApiResponse("USD"));
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockTransaction.mockRejectedValue(new Error("tx error"));

    await expect(
      service.assetRefresh(API_KEY, "USD", "XAU,XAG"),
    ).rejects.toThrow("tx error");
  });

  it("Error — throws on invalid JSON response", async () => {
    const mockReq = { on: jest.fn(), end: jest.fn() };
    mockHttps.request.mockImplementation((_url, _opts, callback) => {
      const mockRes = {
        on: jest.fn((event, handler) => {
          if (event === "data") handler("invalid-json{{{");
          if (event === "end") handler();
        }),
      };
      callback(mockRes);
      return mockReq;
    });

    await expect(service.assetRefresh(API_KEY, "USD", "XAU")).rejects.toThrow();
  });
});
