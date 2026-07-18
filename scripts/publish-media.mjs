import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile(resolve(root, "config/media-assets.json"), "utf8"));
const apply = process.argv.includes("--apply");
const maxBytes = 12 * 1024 * 1024;
const tenant = sanitizeTenant(process.env.MEDIA_TENANT ?? "nox");

function sanitizeTenant(value) {
  const clean = value.replace(/[^a-z0-9-]/gi, "").replace(/^-+|-+$/g, "").toLowerCase();
  if (!clean) throw new Error("MEDIA_TENANT inválido");
  return clean;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

function detectContentType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.subarray(4, 8).toString("ascii") === "ftyp") return "video/mp4";
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "video/webm";
  return "application/octet-stream";
}

async function readAsset(asset) {
  if (asset.source.type === "local") {
    return readFile(resolve(root, asset.source.path));
  }
  const url = new URL(asset.source.url);
  if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") {
    throw new Error(`${asset.id}: origen remoto no permitido`);
  }
  const response = await fetch(url, { headers: { Accept: asset.contentType, "User-Agent": "NOX-media-migrator/1" } });
  if (!response.ok) throw new Error(`${asset.id}: descarga HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const ids = new Set();
const targets = new Set();
for (const asset of manifest.assets) {
  if (ids.has(asset.id) || targets.has(asset.target)) throw new Error(`ID o target duplicado: ${asset.id}`);
  if (!asset.target.startsWith("/") || asset.target.includes("..")) throw new Error(`${asset.id}: target inválido`);
  ids.add(asset.id);
  targets.add(asset.target);
}

if (!apply) {
  const local = manifest.assets.filter((asset) => asset.source.type === "local");
  await Promise.all(local.map(async (asset) => {
    const bytes = await readAsset(asset);
    if (detectContentType(bytes) !== asset.contentType) throw new Error(`${asset.id}: MIME local inesperado`);
  }));
  console.log(`Manifest v${manifest.version}: ${manifest.assets.length} assets (${local.length} locales) válido.`);
  console.log("Para publicar en R2, configurá las variables seguras y agregá --apply.");
  process.exit(0);
}

const accountId = required("R2_ACCOUNT_ID");
const bucket = required("R2_BUCKET");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
});

for (const asset of manifest.assets) {
  const bytes = await readAsset(asset);
  if (bytes.length === 0 || bytes.length > maxBytes) throw new Error(`${asset.id}: tamaño inválido (${bytes.length})`);
  const detected = detectContentType(bytes);
  if (detected !== asset.contentType) throw new Error(`${asset.id}: esperaba ${asset.contentType}, recibió ${detected}`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const key = `${tenant}/${asset.target.replace(/^\/+/, "")}`;

  try {
    const current = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (current.Metadata?.sha256 === sha256 && current.ContentLength === bytes.length) {
      console.log(`= ${key}`);
      continue;
    }
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status !== 404) throw error;
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: asset.contentType,
    ContentLength: bytes.length,
    CacheControl: "public, max-age=31536000, immutable",
    ContentDisposition: "inline",
    Metadata: { sha256, assetid: asset.id, manifest: String(manifest.version) },
  }));
  const stored = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  if (stored.Metadata?.sha256 !== sha256 || stored.ContentLength !== bytes.length) {
    throw new Error(`${asset.id}: verificación posterior a upload falló`);
  }
  console.log(`+ ${key} (${bytes.length} bytes)`);
}

console.log(`Publicación completa: ${manifest.assets.length} assets en ${bucket}/${tenant}.`);
