import { spawn } from "node:child_process";

const env = {
  ...process.env,
  BACKEND_URL: process.env.BACKEND_URL ?? "http://127.0.0.1:3998",
};
const fixture = spawn(process.execPath, ["tests/e2e/fixtures/catalog-server.mjs"], {
  env,
  stdio: ["ignore", "inherit", "inherit"],
});
const next = spawn("npm", ["run", "start"], { env, stdio: "inherit" });

function stop(signal = "SIGTERM") {
  if (!fixture.killed) fixture.kill(signal);
  if (!next.killed) next.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
fixture.on("exit", (code) => {
  if (code && next.exitCode === null) next.kill("SIGTERM");
});
next.on("exit", (code) => {
  if (!fixture.killed) fixture.kill("SIGTERM");
  process.exitCode = code ?? 0;
});
