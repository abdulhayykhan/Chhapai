import { storage } from "./storage";
import { PrintJobDto, Shop, AdminUser, DailyReportDto } from "../types";

let currentServerUrl = "http://localhost:3001/api/v1";
let currentAccessToken: string | null = null;

export function getServerUrl(): string {
  return currentServerUrl;
}

export function setServerUrl(url: string): void {
  let clean = (url || "http://localhost:3001").trim().replace(/\/+$/, "");
  // Normalize legacy ports/paths
  if (clean.includes("localhost:4000")) {
    clean = clean.replace("localhost:4000", "localhost:3001");
  }
  if (!clean.endsWith("/api/v1")) {
    clean = `${clean}/api/v1`;
  }
  currentServerUrl = clean;
  storage.set("server_url", currentServerUrl);
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOn401 = true,
): Promise<T> {
  const url = `${currentServerUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (currentAccessToken) {
    headers["Authorization"] = `Bearer ${currentAccessToken}`;
  }

  // If in Electron, use main process net.fetch (immune to file:// CORS and Private Network Access blocks)
  if (
    typeof window !== "undefined" &&
    (window as any).electronAPI?.apiFetch
  ) {
    const res = await (window as any).electronAPI.apiFetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && retryOn401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return request<T>(path, options, false);
      }
    }

    if (!res.ok) {
      const errorJson = typeof res.data === "object" ? res.data : null;
      const msg =
        errorJson?.error?.message ||
        errorJson?.message ||
        (res.status === 0
          ? "Server se rabta nahi ho saka (Connection Refused). Local server offline hai ya start ho raha hai."
          : `HTTP Error ${res.status}`);
      const code = errorJson?.error?.code || (res.status === 0 ? "CONNECTION_REFUSED" : "UNKNOWN_ERROR");
      const err = new Error(msg);
      (err as any).code = code;
      (err as any).status = res.status;
      throw err;
    }

    return res.data as T;
  }

  // Fallback to standard fetch
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && retryOn401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
  }

  if (!res.ok) {
    let errorJson: any = null;
    try {
      errorJson = await res.json();
    } catch {}
    const msg =
      errorJson?.error?.message ||
      errorJson?.message ||
      `HTTP Error ${res.status}`;
    const code = errorJson?.error?.code || "UNKNOWN_ERROR";
    const err = new Error(msg);
    (err as any).code = code;
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = await storage.get<string>("refresh_token");
  if (!refreshToken) return false;

  const url = `${currentServerUrl}/auth/refresh`;
  const body = JSON.stringify({ refreshToken });

  try {
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.apiFetch
    ) {
      const res = await (window as any).electronAPI.apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        await storage.delete("refresh_token");
        currentAccessToken = null;
        return false;
      }
      currentAccessToken = res.data?.accessToken;
      if (res.data?.refreshToken) {
        await storage.set("refresh_token", res.data.refreshToken);
      }
      return true;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      await storage.delete("refresh_token");
      currentAccessToken = null;
      return false;
    }
    const data = await res.json();
    currentAccessToken = data.accessToken;
    if (data.refreshToken) {
      await storage.set("refresh_token", data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

export const adminApi = {
  async init(): Promise<{ authenticated: boolean; user?: AdminUser }> {
    const savedUrl = await storage.get<string>("server_url");
    if (savedUrl) {
      setServerUrl(savedUrl);
    }
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      try {
        const settings = await adminApi.getSettings();
        return {
          authenticated: true,
          user: {
            shopId: settings.id,
            email: "",
            name: settings.name,
            role: "OWNER",
            id: "",
          },
        };
      } catch {
        return { authenticated: false };
      }
    }
    return { authenticated: false };
  },

  async login(
    email: string,
    password: string,
    serverUrl?: string,
  ): Promise<{ user: AdminUser; accessToken: string }> {
    if (serverUrl) {
      setServerUrl(serverUrl);
    }
    const data = await request<{
      accessToken: string;
      refreshToken: string;
      user: AdminUser;
    }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      false,
    );

    currentAccessToken = data.accessToken;
    await storage.set("refresh_token", data.refreshToken);
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = await storage.get<string>("refresh_token");
    if (refreshToken) {
      try {
        await request(
          "/auth/logout",
          {
            method: "POST",
            body: JSON.stringify({ refreshToken }),
          },
          false,
        );
      } catch {}
    }
    await storage.delete("refresh_token");
    currentAccessToken = null;
  },

  async getJobs(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: PrintJobDto[]; meta: { total: number } }> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<{ data: PrintJobDto[]; meta: { total: number } }>(
      `/admin/jobs${qs}`,
    );
  },

  async getBacklog(): Promise<PrintJobDto[]> {
    return request<PrintJobDto[]>("/admin/jobs/backlog");
  },

  async getJob(id: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}`);
  },

  async approveJob(
    id: string,
    options?: { finalAmount?: number; markPaid?: boolean },
  ): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  async rejectJob(id: string, reason: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async cancelJob(id: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/cancel`, {
      method: "POST",
    });
  },

  async retryJob(id: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/retry`, {
      method: "POST",
    });
  },

  async markPaid(id: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/mark-paid`, {
      method: "POST",
    });
  },

  async claimJob(id: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/claim`, {
      method: "POST",
    });
  },

  async completeJob(id: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/complete`, {
      method: "POST",
    });
  },

  async failJob(id: string, reason: string): Promise<PrintJobDto> {
    return request<PrintJobDto>(`/admin/jobs/${id}/fail`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async getSettings(): Promise<Shop> {
    return request<Shop>("/admin/settings");
  },

  async updateSettings(body: Partial<Shop>): Promise<Shop> {
    return request<Shop>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async getDailyReport(date: string): Promise<DailyReportDto> {
    return request<DailyReportDto>(`/admin/reports/daily?date=${date}`);
  },

  async getQrCode(format: "png" | "svg" = "png"): Promise<string> {
    const res = await fetch(`${currentServerUrl}/admin/qr?format=${format}`, {
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
      },
    });
    if (!res.ok) throw new Error("Failed to load QR");
    if (format === "svg") {
      return res.text();
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  async getFileBlob(jobId: string): Promise<Blob> {
    const res = await fetch(`${currentServerUrl}/admin/jobs/${jobId}/file`, {
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
      },
    });
    if (!res.ok) throw new Error("File download failed");
    return res.blob();
  },
};
