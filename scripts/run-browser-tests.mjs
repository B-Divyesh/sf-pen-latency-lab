import { spawn } from "node:child_process";

const externalUrl = process.env.STROKE_LAB_URL;

function runTest(url) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["tests/site.browser.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, STROKE_LAB_URL: url },
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

if (externalUrl) process.exit(await runTest(externalUrl));

const localUrl = "http://127.0.0.1:4173";
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--config", "vite.site.config.ts", "--host", "127.0.0.1", "--port", "4173"], {
  cwd: process.cwd(),
  stdio: "inherit",
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(localUrl);
      if (response.ok) { ready = true; break; }
    } catch { /* wait for the preview */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("The local production preview did not start.");
  process.exitCode = await runTest(localUrl);
} finally {
  server.kill("SIGTERM");
}
