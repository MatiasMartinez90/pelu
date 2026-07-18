import manifest from "../../config/media-assets.json";
import { mediaConfigured, mediaSource } from "./media";

const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));

export function mediaAsset(id: string) {
  const asset = assets.get(id);
  if (!asset) throw new Error(`unknown media asset: ${id}`);
  if (mediaConfigured()) return mediaSource(asset.target);
  if (asset.source.type === "local") return asset.target;
  if (!asset.source.url) throw new Error(`remote media asset without fallback URL: ${id}`);
  return asset.source.url;
}
