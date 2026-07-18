import assert from "node:assert/strict";
import test from "node:test";

import { createMediaConfig } from "../../src/lib/media";
import { mediaAsset } from "../../src/lib/media-assets";

test("preserva assets locales cuando el CDN no está configurado", () => {
  const media = createMediaConfig({});

  assert.equal(media.configured, false);
  assert.equal(media.source("/media/team/thiago.v1.webp"), "/media/team/thiago.v1.webp");
  assert.equal(media.imageLoader({ src: "/img/hero-poster.jpg", width: 657 }), "/img/hero-poster.jpg");
});

test("separa assets por tenant y genera sólo variantes permitidas", () => {
  const media = createMediaConfig({
    NEXT_PUBLIC_MEDIA_PUBLIC_URL: "https://media-dev-nox.cloud-it.com.ar/",
    NEXT_PUBLIC_MEDIA_TRANSFORM_URL: "https://media-dev-nox.cloud-it.com.ar/",
    NEXT_PUBLIC_MEDIA_TENANT: "Cliente Demo",
  });

  assert.equal(media.configured, true);
  assert.equal(
    media.source("/media/team/thiago.v1.webp"),
    "https://media-dev-nox.cloud-it.com.ar/clientedemo/media/team/thiago.v1.webp",
  );
  assert.equal(
    media.imageLoader({ src: "/img/hero-poster.jpg", width: 657, quality: 78 }),
    "https://media-dev-nox.cloud-it.com.ar/cdn-cgi/image/width=640,quality=80,format=auto,fit=cover/https://media-dev-nox.cloud-it.com.ar/clientedemo/img/hero-poster.jpg",
  );
  assert.equal(
    media.imageLoader({
      src: "https://media-dev-nox.cloud-it.com.ar/clientedemo/media/gallery/work-01.v1.webp",
      width: 930,
    }),
    "https://media-dev-nox.cloud-it.com.ar/cdn-cgi/image/width=960,quality=80,format=auto,fit=cover/https://media-dev-nox.cloud-it.com.ar/clientedemo/media/gallery/work-01.v1.webp",
  );
});

test("no reescribe URLs externas ni data URLs", () => {
  const media = createMediaConfig({ NEXT_PUBLIC_MEDIA_PUBLIC_URL: "https://media.example.test" });

  assert.equal(media.source("https://images.example.test/photo.webp"), "https://images.example.test/photo.webp");
  assert.equal(media.source("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP"), "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP");
});

test("rechaza rutas ambiguas y evita tenants vacíos", () => {
  const media = createMediaConfig({
    NEXT_PUBLIC_MEDIA_PUBLIC_URL: "https://media.example.test",
    NEXT_PUBLIC_MEDIA_TENANT: "---",
  });

  assert.equal(media.source("/poster.webp"), "https://media.example.test/installation/poster.webp");
  assert.throws(() => media.source("/media/../secret.jpg"), /invalid media path/);
});

test("el manifiesto conserva fallback local y remoto antes del cutover", () => {
  assert.equal(mediaAsset("team.thiago"), "/media/team/thiago.v1.webp");
  assert.match(mediaAsset("gallery.work01"), /^https:\/\/images\.unsplash\.com\//);
  assert.throws(() => mediaAsset("asset.inexistente"), /unknown media asset/);
});
