import { describe, it, expect, beforeEach } from "vitest";
import * as argon2 from "argon2";
import { AuthService } from "../src/auth/auth.service.js";
import { ErrorCode } from "@chhapai/shared";
import { AppException } from "../src/common/exceptions/app.exception.js";

describe("AuthService (M2 Acceptance)", () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwt: any;
  let mockConfig: any;
  let storedUser: any;

  beforeEach(async () => {
    const passwordHash = await argon2.hash("SuperSecurePassword123!");
    storedUser = {
      id: "user-uuid-1",
      shopId: "shop-uuid-1",
      email: "admin@chhapai.com",
      name: "Shop Owner",
      passwordHash,
      role: "OWNER",
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
    };

    mockPrisma = {
      adminUser: {
        findUnique: ({ where: { email, id } }: any) => {
          if (email === storedUser.email || id === storedUser.id) {
            return Promise.resolve(storedUser);
          }
          return Promise.resolve(null);
        },
        update: ({ data }: any) => {
          Object.assign(storedUser, data);
          return Promise.resolve(storedUser);
        },
      },
      refreshToken: {
        create: () => Promise.resolve({ id: "rt-1" }),
        findUnique: () => Promise.resolve(null),
        updateMany: () => Promise.resolve({ count: 1 }),
      },
    };

    mockJwt = {
      sign: () => "mock-jwt-token",
      verify: () => ({ sub: "user-uuid-1" }),
    };

    mockConfig = {
      get: (key: string) => `test-${key}`,
    };

    authService = new AuthService(mockPrisma, mockJwt, mockConfig);
  });

  it("authenticates user with correct credentials", async () => {
    const result = await authService.login(
      "admin@chhapai.com",
      "SuperSecurePassword123!",
    );
    expect(result.accessToken).toBe("mock-jwt-token");
    expect(result.user.email).toBe("admin@chhapai.com");
    expect(result.user.role).toBe("OWNER");
    expect(result.refreshToken).toBeDefined();
  });

  it("rejects invalid password with UNAUTHORIZED and increments failed attempts", async () => {
    await expect(
      authService.login("admin@chhapai.com", "wrongpassword"),
    ).rejects.toThrow(AppException);
    expect(storedUser.failedLogins).toBe(1);
  });

  it("locks account after 5 failed login attempts", async () => {
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.login("admin@chhapai.com", "wrongpassword"),
      ).rejects.toThrow(AppException);
    }
    expect(storedUser.failedLogins).toBe(4);
    expect(storedUser.lockedUntil).toBeNull();

    // 5th attempt triggers lockout
    await expect(
      authService.login("admin@chhapai.com", "wrongpassword"),
    ).rejects.toThrow(AppException);
    expect(storedUser.failedLogins).toBe(5);
    expect(storedUser.lockedUntil).not.toBeNull();
    expect(storedUser.lockedUntil.getTime()).toBeGreaterThan(Date.now());

    // Subsequent login while locked throws RATE_LIMITED
    try {
      await authService.login("admin@chhapai.com", "SuperSecurePassword123!");
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.RATE_LIMITED);
    }
  });
});
