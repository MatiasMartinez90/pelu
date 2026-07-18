import manifest from "../../config/media-assets.json";
import { mediaConfigured, mediaSource } from "./media";

const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
const assetsByTarget = new Map(manifest.assets.map((asset) => [asset.target, asset]));

export function mediaAsset(id: string) {
  const asset = assets.get(id);
  if (!asset) throw new Error(`unknown media asset: ${id}`);
  if (mediaConfigured()) return mediaSource(asset.target);
  if (asset.source.type === "local") return asset.target;
  if (!asset.source.url) throw new Error(`remote media asset without fallback URL: ${id}`);
  return asset.source.url;
}

export function mediaAssetPath(path: string) {
  if (mediaConfigured() || /^https?:\/\//i.test(path) || path.startsWith("data:")) {
    return mediaSource(path);
  }
  const asset = assetsByTarget.get(path);
  if (asset?.source.type === "remote" && asset.source.url) return asset.source.url;
  return path;
}
