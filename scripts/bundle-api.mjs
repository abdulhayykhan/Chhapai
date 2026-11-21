import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const targetDir = path.join(rootDir, "apps", "desktop", "resources", "api");

console.log("[BundleAPI] Preparing embedded API bundle in:", targetDir);

// 1. Remove old bundle if exists
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// 2. Deploy API production files
console.log("[BundleAPI] Running pnpm deploy for API...");
execSync(`pnpm --filter @chhapai/api --prod deploy "${targetDir}"`, {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

// 3. Find and copy generated Prisma client
console.log("[BundleAPI] Copying Prisma query engine & client...");
function findPrismaDirs(baseDir) {
  const pnpmDir = path.join(baseDir, "node_modules", ".pnpm");
  if (!fs.existsSync(pnpmDir)) return null;
  const entries = fs.readdirSync(pnpmDir);
  for (const entry of entries) {
    if (entry.startsWith("@prisma+client@")) {
      const srcPrisma = path.join(pnpmDir, entry, "node_modules", ".prisma", "client");
      if (fs.existsSync(srcPrisma)) {
        return srcPrisma;
      }
    }
  }
  return null;
}

const rootPrismaClient = findPrismaDirs(rootDir);
const targetPrismaClient = findPrismaDirs(targetDir);

if (rootPrismaClient && targetPrismaClient) {
  console.log(`[BundleAPI] Copying from ${rootPrismaClient} to ${targetPrismaClient}`);
  fs.cpSync(rootPrismaClient, targetPrismaClient, { recursive: true, force: true });
} else {
  console.warn("[BundleAPI] Warning: Could not locate Prisma client directory to copy");
}

// Rename node_modules to api_modules to prevent electron-builder from ignoring it
const nodeModulesDir = path.join(targetDir, "node_modules");
const apiModulesDir = path.join(targetDir, "api_modules");
if (fs.existsSync(nodeModulesDir)) {
  if (fs.existsSync(apiModulesDir)) {
    fs.rmSync(apiModulesDir, { recursive: true, force: true });
  }
  fs.renameSync(nodeModulesDir, apiModulesDir);
  console.log("[BundleAPI] Renamed node_modules to api_modules for packaging");
}

console.log("[BundleAPI] Embedded API bundle ready at:", targetDir);
