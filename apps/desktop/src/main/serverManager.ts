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
  private errorMessage?: string;

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

  private async waitForPortAlive(port: number, timeoutMs = 25000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (await this.checkPortAlive(port)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
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
    let apiDir = path.resolve(__dirname, "../../../api");

    if (!fs.existsSync(apiPath)) {
      // In packaged app, check resources
      apiDir = path.join(process.resourcesPath, "api");
      apiPath = path.join(apiDir, "dist", "main.js");

      // Check if api_modules needs to be restored to node_modules
      const apiModules = path.join(apiDir, "api_modules");
      const nodeModules = path.join(apiDir, "node_modules");
      if (fs.existsSync(apiModules) && !fs.existsSync(nodeModules)) {
        try {
          fs.renameSync(apiModules, nodeModules);
          console.log("[ServerManager] Restored api_modules to node_modules");
        } catch (err) {
          console.warn("[ServerManager] Could not rename api_modules to node_modules:", err);
        }
      }
    }

    if (!fs.existsSync(apiPath)) {
      console.warn(`[ServerManager] API entry file not found at: ${apiPath}`);
      this.errorMessage = `API entry file not found at: ${apiPath}`;
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

    // Ensure .env exists in apiDir so Prisma & ConfigModule always find DATABASE_URL
    try {
      const envPath = path.join(apiDir, ".env");
      if (!fs.existsSync(envPath)) {
        fs.writeFileSync(
          envPath,
          `DATABASE_URL="${dbUrl}"\nPORT=${this.port}\nJWT_SECRET="${process.env.JWT_SECRET || "chhapai_jwt_secure_2026"}"\nSTORAGE_PATH="${storageDir.replace(/\\/g, "/")}"\nNODE_ENV=production\n`,
        );
      }
    } catch (envErr) {
      console.warn("[ServerManager] Could not create local .env file:", envErr);
    }

    // Ensure log file is available for debugging child process
    const logPath = path.join(app.getPath("userData"), "embedded-api.log");
    let logStream: fs.WriteStream | null = null;
    try {
      logStream = fs.createWriteStream(logPath, { flags: "a" });
      logStream.write(`\n--- [${new Date().toISOString()}] Starting embedded API server ---\n`);
    } catch (logErr) {
      console.warn("[ServerManager] Could not open log stream:", logErr);
    }

    console.log(`[ServerManager] Starting embedded API from: ${apiPath}`);

    const apiModules = path.join(apiDir, "api_modules");
    const nodeModules = path.join(apiDir, "node_modules");
    const nodePath = [nodeModules, apiModules].filter((d) => fs.existsSync(d)).join(path.delimiter);

    try {
      this.apiProcess = fork(apiPath, [], {
        cwd: apiDir,
        execPath: process.execPath,
        env: {
          ...process.env,
          PORT: String(this.port),
          DATABASE_URL: dbUrl,
          JWT_SECRET: process.env.JWT_SECRET || "chhapai_jwt_secure_2026",
          STORAGE_PATH: storageDir,
          NODE_ENV: "production",
          ELECTRON_RUN_AS_NODE: "1",
          NODE_PATH: nodePath,
        },
        silent: true,
      });

      this.apiProcess.stdout?.on("data", (data) => {
        const text = data.toString();
        logStream?.write(`[stdout] ${text}`);
        console.log(`[EmbeddedAPI stdout] ${text.trim()}`);
      });

      this.apiProcess.stderr?.on("data", (data) => {
        const text = data.toString();
        logStream?.write(`[stderr] ${text}`);
        console.error(`[EmbeddedAPI stderr] ${text.trim()}`);
        this.errorMessage = text.slice(0, 300);
      });

      this.apiProcess.on("exit", (code, signal) => {
        const exitMsg = `Process exited with code ${code}, signal ${signal}`;
        logStream?.write(`[exit] ${exitMsg}\n`);
        console.log(`[EmbeddedAPI] ${exitMsg}`);
        this.isRunning = false;
        this.isEmbedded = false;
        this.apiProcess = null;
      });

      // Wait up to 25 seconds for the embedded API to become ready
      console.log(`[ServerManager] Waiting for embedded API to be alive on port ${this.port}...`);
      const alive = await this.waitForPortAlive(this.port, 25000);
      if (alive) {
        console.log(`[ServerManager] Embedded API is alive on port ${this.port}!`);
        this.isRunning = true;
        this.isEmbedded = true;
        this.errorMessage = undefined;
      } else {
        console.warn(`[ServerManager] Embedded API timed out waiting for port ${this.port}`);
        this.isRunning = false;
        this.isEmbedded = false;
        if (!this.errorMessage) {
          this.errorMessage = "API server response timeout (Port 3001 did not open in 25s)";
        }
      }

      // 4. Try starting Cloudflare Tunnel if configured or quick tunnel
      this.startTunnelIfAvailable();

      return this.getStatus();
    } catch (err: any) {
      console.error("[ServerManager] Failed to start embedded API:", err);
      this.errorMessage = err?.message || "Failed to start API";
      return {
        ...this.getStatus(),
        error: this.errorMessage,
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
      error: this.errorMessage,
    };
  }
}

export const serverManager = new ServerManager();
