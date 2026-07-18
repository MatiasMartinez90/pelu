export const mediaWidths = [96, 192, 320, 640, 960, 1280, 1600] as const;
const mediaQualities = [70, 80, 85] as const;

type MediaEnvironment = {
  NEXT_PUBLIC_MEDIA_PUBLIC_URL?: string;
  NEXT_PUBLIC_MEDIA_TRANSFORM_URL?: string;
  NEXT_PUBLIC_MEDIA_TENANT?: string;
};

function closest(allowed: readonly number[], requested: number) {
  return allowed.reduce((best, value) =>
    Math.abs(value - requested) < Math.abs(best - requested) ? value : best,
  );
}

function safePath(path: string) {
  const clean = path.split("?", 1)[0].replace(/^\/+/, "");
  if (!clean || clean.split("/").some((part) => part === ".." || part === ".")) {
    throw new Error("invalid media path");
  }
  return clean;
}

export function createMediaConfig(env: MediaEnvironment) {
  const publicOrigin = (env.NEXT_PUBLIC_MEDIA_PUBLIC_URL ?? "").replace(/\/$/, "");
  const transformOrigin = (env.NEXT_PUBLIC_MEDIA_TRANSFORM_URL ?? publicOrigin).replace(/\/$/, "");
  const sanitizedTenant = (env.NEXT_PUBLIC_MEDIA_TENANT ?? "nox")
    .replace(/[^a-z0-9-]/gi, "")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const tenant = sanitizedTenant || "nox";

  function source(src: string) {
    if (!publicOrigin || /^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
    return `${publicOrigin}/${tenant}/${safePath(src)}`;
  }

  function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
    const resolvedSource = source(src);
    const managedAbsolute = Boolean(publicOrigin)
      && /^https?:\/\//i.test(src)
      && new URL(src).origin === new URL(publicOrigin).origin
      && new URL(src).pathname.startsWith(`/${tenant}/`);
    const managed = !/^https?:\/\//i.test(src) || managedAbsolute;
    if (!publicOrigin || !transformOrigin || !managed || src.startsWith("data:")) return resolvedSource;
    const safeWidth = closest(mediaWidths, width);
    const safeQuality = closest(mediaQualities, quality ?? 80);
    return `${transformOrigin}/cdn-cgi/image/width=${safeWidth},quality=${safeQuality},format=auto,fit=cover/${resolvedSource}`;
  }

  return {
    configured: Boolean(publicOrigin),
    imageLoader,
    source,
  };
}

const media = createMediaConfig({
  NEXT_PUBLIC_MEDIA_PUBLIC_URL: process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL,
  NEXT_PUBLIC_MEDIA_TRANSFORM_URL: process.env.NEXT_PUBLIC_MEDIA_TRANSFORM_URL,
  NEXT_PUBLIC_MEDIA_TENANT: process.env.NEXT_PUBLIC_MEDIA_TENANT,
});

export const mediaSource = media.source;
export const mediaImageLoader = media.imageLoader;
export const mediaConfigured = () => media.configured;
