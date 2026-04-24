import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import net from "node:net";

const HOST = "127.0.0.1";
const PORT = Number(process.env.SCREENSHOT_PORT ?? 3000);
const BASE = `http://${HOST}:${PORT}`;
const OUT = join(process.cwd(), ".github", "assets", "screenshots");
const VIEWPORT = { width: 1920, height: 1080 };

const ROUTES = [
  { path: "/", file: "home.png" },
  { path: "/library", file: "library.png" },
  { path: "/duplicates", file: "duplicates.png" },
  { path: "/wishlist", file: "wishlist.png" },
  { path: "/achievements", file: "achievements.png" },
  { path: "/cloud", file: "cloud.png" },
  { path: "/accounts", file: "accounts.png" },
];

function waitForPort(port, host, timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const sock = net.createConnection({ port, host });
      sock.once("connect", () => {
        sock.destroy();
        resolve();
      });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error("server timeout"));
        else setTimeout(tryOnce, 500);
      });
    };
    tryOnce();
  });
}

async function isServerUp() {
  try {
    await waitForPort(PORT, HOST, 500);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  let serverProc = null;
  const alreadyUp = await isServerUp();

  if (!alreadyUp) {
    console.log(`[screenshots] starting next dev on :${PORT}`);
    serverProc = spawn("npx", ["next", "dev", "-p", String(PORT)], {
      cwd: process.cwd(),
      shell: true,
      stdio: ["ignore", "inherit", "inherit"],
    });
    await waitForPort(PORT, HOST, 120_000);
    await new Promise((r) => setTimeout(r, 2000));
  } else {
    console.log(`[screenshots] reusing existing server on :${PORT}`);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  for (const { path, file } of ROUTES) {
    const url = `${BASE}${path}`;
    const out = join(OUT, file);
    console.log(`[screenshots] ${url} -> ${file}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out, fullPage: false });
  }

  await browser.close();
  if (serverProc) serverProc.kill("SIGTERM");
  console.log("[screenshots] done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
