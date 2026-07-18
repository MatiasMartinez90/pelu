const apply = process.argv.includes("--apply");
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const bucket = process.env.R2_BUCKET ?? "nox-dev-media";
const domain = process.env.MEDIA_DOMAIN ?? "media-dev-nox.cloud-it.com.ar";

if (!apply) {
  console.log(`Plan dev: bucket ${bucket}, dominio ${domain}, TLS mínimo 1.2 y r2.dev deshabilitado.`);
  console.log("La ejecución requiere variables seguras y --apply; no modifica producción.");
  process.exit(0);
}

if (!accountId || !zoneId || !process.env.CLOUDFLARE_API_TOKEN) {
  throw new Error("Faltan CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ZONE_ID o CLOUDFLARE_API_TOKEN");
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets`;
const headers = {
  Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
  "Content-Type": "application/json",
};

async function cloudflare(path, init = {}, accepted = [200]) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!accepted.includes(response.status) || (response.ok && body.success === false)) {
    const messages = body.errors?.map((error) => error.message).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Cloudflare rechazó ${init.method ?? "GET"} ${path}: ${messages}`);
  }
  return { status: response.status, result: body.result };
}

const current = await cloudflare(`/${bucket}`, {}, [200, 404]);
if (current.status === 404) {
  await cloudflare("", { method: "POST", body: JSON.stringify({ name: bucket }) });
  console.log(`+ bucket ${bucket}`);
} else {
  console.log(`= bucket ${bucket}`);
}

const domains = await cloudflare(`/${bucket}/domains/custom`);
if (!domains.result?.domains?.some((item) => item.domain === domain)) {
  await cloudflare(`/${bucket}/domains/custom`, {
    method: "POST",
    body: JSON.stringify({ domain, enabled: true, zoneId, minTLS: "1.2" }),
  });
  console.log(`+ dominio ${domain}`);
} else {
  await cloudflare(`/${bucket}/domains/custom/${domain}`, {
    method: "PUT",
    body: JSON.stringify({ enabled: true, minTLS: "1.2" }),
  });
  console.log(`= dominio ${domain}`);
}

await cloudflare(`/${bucket}/domains/managed`, {
  method: "PUT",
  body: JSON.stringify({ enabled: false }),
});

const verified = await cloudflare(`/${bucket}/domains/custom/${domain}`);
if (!verified.result?.enabled || verified.result?.status?.ownership === "error" || verified.result?.status?.ssl === "error") {
  throw new Error(`El dominio ${domain} no quedó habilitado correctamente`);
}
console.log(`R2 dev configurado; ownership=${verified.result.status?.ownership}, ssl=${verified.result.status?.ssl}.`);
