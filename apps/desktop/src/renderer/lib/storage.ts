// Storage abstraction supporting Electron safeStore with localStorage fallback

export const storage = {
  async get<T = any>(key: string): Promise<T | null> {
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.getStore
    ) {
      try {
        const val = await (window as any).electronAPI.getStore(key);
        return val ?? null;
      } catch (err) {
        console.error("electron store get error:", err);
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(`chhapai_${key}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw as any;
      }
    }
    return null;
  },

  async set(key: string, value: any): Promise<void> {
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.setStore
    ) {
      try {
        await (window as any).electronAPI.setStore(key, value);
        return;
      } catch (err) {
        console.error("electron store set error:", err);
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        `chhapai_${key}`,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    }
  },

  async delete(key: string): Promise<void> {
    if (
      typeof window !== "undefined" &&
      (window as any).electronAPI?.deleteStore
    ) {
      try {
        await (window as any).electronAPI.deleteStore(key);
        return;
      } catch (err) {
        console.error("electron store delete error:", err);
      }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(`chhapai_${key}`);
    }
  },
};
