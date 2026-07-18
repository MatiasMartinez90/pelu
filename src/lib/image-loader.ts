import type { ImageLoaderProps } from "next/image";
import { mediaImageLoader } from "@/lib/media";

export default function imageLoader(props: ImageLoaderProps) {
  return mediaImageLoader(props);
}
