import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
let failed = false;

function assertBudget(label, actual, maximum) {
  const ok = actual <= maximum;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${actual} B / ${maximum} B`);
  if (!ok) failed = true;
}

function routeAssets(route, sourcePaths, jsBudget, cssBudget) {
  const source = (Array.isArray(sourcePaths) ? sourcePaths : [sourcePaths])
    .map((sourcePath) => readFileSync(join(root, sourcePath), "utf8"))
    .join("\n");
  const assets = [...source.matchAll(/(?:\/_next\/)?(static\/(?:chunks|css)\/[^"',?\\]+\.(?:js|css))/g)]
    .map((match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index);

  let js = 0;
  let css = 0;
  for (const asset of assets) {
    const file = join(root, ".next", asset);
    if (!existsSync(file)) continue;
    const compressed = gzipSync(readFileSync(file)).byteLength;
    if (asset.endsWith(".js")) js += compressed;
    if (asset.endsWith(".css")) css += compressed;
  }
  assertBudget(`${route} JavaScript inicial gzip`, js, jsBudget);
  assertBudget(`${route} CSS inicial gzip`, css, cssBudget);
}

routeAssets("home", ".next/server/app/index.html", 205_000, 25_000);
routeAssets("admin", [
  ".next/server/app/admin/page_client-reference-manifest.js",
  ".next/server/app/admin/page/build-manifest.json",
], 215_000, 25_000);
routeAssets("shop", [
  ".next/server/app/shop/page_client-reference-manifest.js",
  ".next/server/app/shop/page/build-manifest.json",
], 210_000, 25_000);

for (const [asset, maximum] of [
  ["public/img/hero-poster.jpg", 120_000],
  ["public/videos/hero.webm", 650_000],
]) {
  assertBudget(asset, statSync(join(root, asset)).size, maximum);
}

if (failed) process.exit(1);
