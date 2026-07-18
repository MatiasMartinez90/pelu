import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = resolve(import.meta.dirname, "..");
const publicPath = resolve(root, process.argv[2] ?? "config/installation.json");
const seedPath = resolve(root, process.argv[3] ?? "config/installation.seed.json");
const readJson = (path) => readFile(path, "utf8").then(JSON.parse);
const [publicSchema, seedSchema, installation, seed] = await Promise.all([
  readJson(resolve(root, "config/installation.schema.json")),
  readJson(resolve(root, "config/installation.seed.schema.json")),
  readJson(publicPath),
  readJson(seedPath),
]);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validations = [
  ["installation", ajv.compile(publicSchema), installation],
  ["seed", ajv.compile(seedSchema), seed],
];
let invalid = false;
for (const [label, validate, value] of validations) {
  if (validate(value)) continue;
  invalid = true;
  for (const error of validate.errors ?? []) {
    console.error(`${label}${error.instancePath || "/"}: ${error.message}`);
  }
}

const errors = [];
const unique = (values, label) => {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) errors.push(`${label} duplicados: ${[...new Set(duplicates)].join(", ")}`);
};
const enabledWithoutAddress = Object.entries(installation.channels)
  .filter(([, channel]) => channel.enabled && !channel.address)
  .map(([name]) => name);
if (enabledWithoutAddress.length) errors.push(`canales habilitados sin address: ${enabledWithoutAddress.join(", ")}`);
if (installation.features.onlinePayments && !installation.shop.enabled) errors.push("onlinePayments requiere shop.enabled");

const professionalSlugs = seed.professionals.map(({ slug }) => slug);
const serviceSlugs = seed.services.map(({ slug }) => slug);
unique(professionalSlugs, "professionals.slug");
unique(serviceSlugs, "services.slug");
unique(seed.inventory.map(({ sku }) => sku), "inventory.sku");
if (!professionalSlugs.includes(installation.demo.defaultBarberSlug)) {
  errors.push(`demo.defaultBarberSlug no existe: ${installation.demo.defaultBarberSlug}`);
}
for (const professional of seed.professionals) {
  const missing = professional.services.filter((slug) => !serviceSlugs.includes(slug));
  if (missing.length) errors.push(`${professional.slug} referencia servicios inexistentes: ${missing.join(", ")}`);
}
const scheduleKeys = [];
for (const schedule of seed.schedules) {
  if (schedule.professional && !professionalSlugs.includes(schedule.professional)) {
    errors.push(`horario referencia profesional inexistente: ${schedule.professional}`);
  }
  if (schedule.closesAt <= schedule.opensAt) errors.push(`horario inválido: ${schedule.opensAt}-${schedule.closesAt}`);
  scheduleKeys.push(`${schedule.professional ?? "business"}:${schedule.dayOfWeek}`);
}
unique(scheduleKeys, "schedules");

for (const error of errors) console.error(error);
if (invalid || errors.length) process.exit(1);
console.log(`Instalación ${installation.tenant} v${installation.schemaVersion}: contrato y seed válidos.`);
