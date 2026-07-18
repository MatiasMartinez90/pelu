import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schema = JSON.parse(readFileSync(new URL("../../config/installation.schema.json", import.meta.url), "utf8"));
const installation = JSON.parse(readFileSync(new URL("../../config/installation.json", import.meta.url), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

test("the checked-in installation satisfies the public contract", () => {
  assert.equal(validate(installation), true, JSON.stringify(validate.errors));
});

test("the contract rejects unknown fields and malformed tenant IDs", () => {
  const invalid = structuredClone(installation);
  invalid.tenant = "Cliente Con Espacios";
  invalid.brand.unknown = true;
  assert.equal(validate(invalid), false);
  assert.ok(validate.errors?.some((error) => error.keyword === "additionalProperties"));
  assert.ok(validate.errors?.some((error) => error.instancePath === "/tenant"));
});

test("enabled channels always declare an address", () => {
  for (const [name, channel] of Object.entries(installation.channels) as Array<[string, { enabled: boolean; address: string }]>) {
    if (channel.enabled) assert.ok(channel.address, `${name} is enabled without an address`);
  }
});
