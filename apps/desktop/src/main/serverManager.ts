import { fork, spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import http from "http";
import { app } from "electron";

export interface ServerStatus {
  isRunning: boolean;
  isEmbedded: boolean;
  port: number;
  tunnelUrl: string | null;
  error?: string;
}

class ServerManager {
  private apiProcess: ChildProcess | null = null;
  private tunnelProcess: ChildProcess | null = null;
  private isEmbedded = false;
  private isRunning = false;
  private port = 3001;
  private tunnelUrl: string | null = null;

  private checkPortAlive(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 404);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async start(): Promise<ServerStatus> {
    // 1. Check if external API is already running
    const alreadyAlive = await this.checkPortAlive(this.port);
    if (alreadyAlive) {
      console.log(`[ServerManager] Found existing API running on port ${this.port}`);
      this.isRunning = true;
      this.isEmbedded = false;
      return this.getStatus();
    }

    // 2. Locate API build
    let apiPath = path.resolve(__dirname, "../../../api/dist/main.js");
    if (!fs.existsSync(apiPath)) {
      // In packaged app, check resources
      apiPath = path.join(process.resourcesPath, "api", "dist", "main.js");
    }

    if (!fs.existsSync(apiPath)) {
      console.warn(`[ServerManager] API entry file not found at: ${apiPath}`);
      return this.getStatus();
    }

    // 3. Prepare storage directory for uploads
    const storageDir = path.join(app.getPath("userData"), "uploads");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const dbUrl =
      process.env.DATABASE_URL ||
      "postgresql://postgres.zsnkjfpoyvipvxmdkwsf:ChhapaiSecure2026!@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

    console.log(`[ServerManager] Starting embedded API from: ${apiPath}`);

    try {
      this.apiProcess = fork(apiPath, [], {
        env: {
          ...process.env,
          PORT: String(this.port),
          DATABASE_URL: dbUrl,
          JWT_SECRET: process.env.JWT_SECRET || "chhapai_jwt_secure_2026",
          STORAGE_PATH: storageDir,
          NODE_ENV: "production",
        },
        silent: true,
      });

      this.isEmbedded = true;
      this.isRunning = true;

      this.apiProcess.stdout?.on("data", (data) => {
        console.log(`[EmbeddedAPI stdout] ${data.toString().trim()}`);
      });

      this.apiProcess.stderr?.on("data", (data) => {
        console.error(`[EmbeddedAPI stderr] ${data.toString().trim()}`);
      });

      this.apiProcess.on("exit", (code, signal) => {
        console.log(`[EmbeddedAPI] Process exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.isEmbedded = false;
        this.apiProcess = null;
      });

      // 4. Try starting Cloudflare Tunnel if configured or quick tunnel
      this.startTunnelIfAvailable();

      return this.getStatus();
    } catch (err: any) {
      console.error("[ServerManager] Failed to start embedded API:", err);
      return {
        ...this.getStatus(),
        error: err?.message || "Failed to start API",
      };
    }
  }

  private startTunnelIfAvailable() {
    const tunnelToken = process.env.CLOUDFLARE_TUNNEL_TOKEN;

    if (tunnelToken) {
      try {
        console.log("[ServerManager] Launching configured Cloudflare Named Tunnel...");
        this.tunnelProcess = spawn("cloudflared", ["tunnel", "run", "--token", tunnelToken]);

        this.tunnelProcess.stderr?.on("data", (chunk: Buffer) => {
          const str = chunk.toString();
          console.log(`[Cloudflared] ${str.trim()}`);
        });
      } catch (err) {
        console.warn("[ServerManager] Failed to launch cloudflared with token:", err);
      }
    } else {
      // Quick Tunnel mode for temporary public testing
      try {
        console.log("[ServerManager] Attempting Cloudflare Quick Tunnel on port 3001...");
        this.tunnelProcess = spawn("cloudflared", [
          "tunnel",
          "--url",
          `http://localhost:${this.port}`,
          "--no-autoupdate",
        ]);

        this.tunnelProcess.stderr?.on("data", (chunk: Buffer) => {
          const str = chunk.toString();
          // Extract https://*.trycloudflare.com
          const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
          if (match && match[0]) {
            this.tunnelUrl = match[0];
            console.log(`[ServerManager] 🌐 Public Tunnel URL ready: ${this.tunnelUrl}`);
          }
        });

        this.tunnelProcess.on("error", () => {
          // cloudflared not installed on machine, ignore gracefully
          console.log("[ServerManager] cloudflared binary not found in PATH, running in local-only mode.");
          this.tunnelProcess = null;
        });
      } catch {
        // Ignore if cloudflared is not installed
      }
    }
  }

  public stop(): void {
    if (this.tunnelProcess) {
      console.log("[ServerManager] Killing tunnel process...");
      this.tunnelProcess.kill();
      this.tunnelProcess = null;
    }

    if (this.apiProcess) {
      console.log("[ServerManager] Killing embedded API process...");
      this.apiProcess.kill();
      this.apiProcess = null;
      this.isRunning = false;
      this.isEmbedded = false;
    }
  }

  public getStatus(): ServerStatus {
    return {
      isRunning: this.isRunning,
      isEmbedded: this.isEmbedded,
      port: this.port,
      tunnelUrl: this.tunnelUrl,
    };
  }
}

export const serverManager = new ServerManager();
