import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(import.meta.dirname, "..");
const [schema, installation] = await Promise.all([
  readFile(resolve(root, "config/installation.schema.json"), "utf8").then(JSON.parse),
  readFile(resolve(root, "config/installation.json"), "utf8").then(JSON.parse),
]);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

if (!validate(installation)) {
  for (const error of validate.errors ?? []) {
    console.error(`${error.instancePath || "/"}: ${error.message}`);
  }
  process.exit(1);
}

const channelAddresses = Object.entries(installation.channels)
  .filter(([, channel]) => channel.enabled)
  .filter(([, channel]) => !channel.address);
if (channelAddresses.length) {
  console.error(`Canales habilitados sin address: ${channelAddresses.map(([name]) => name).join(", ")}`);
  process.exit(1);
}
if (installation.shop.enabled !== installation.features.onlinePayments && installation.features.onlinePayments) {
  console.error("onlinePayments requiere shop.enabled");
  process.exit(1);
}

console.log(`Instalación ${installation.tenant} v${installation.schemaVersion}: válida.`);
