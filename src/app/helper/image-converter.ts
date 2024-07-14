import {decodeWebP, encodeJpg, encodePng} from "image-in-browser";
import {fromByteArray, toByteArray} from "base64-js";
import {dump, insert, load, TagValues} from "piexif-ts";
import {addMetadata} from "meta-png";

export async function convertToJpeg(webp: Blob, generationMetadata: any): Promise<Blob> {
  return convertToJpegSync(new Uint8Array(await webp.arrayBuffer()), generationMetadata);
}
export function convertToJpegSync(webp: Uint8Array, generationMetadata: any): Blob {
  const memory = decodeWebP({
    data: webp,
  });
  let out = encodeJpg({
    image: memory!,
  });
  const dataUri = `data:image/jpeg;base64,${fromByteArray(out)}`;
  const exif = load(dataUri);
  exif["0th"] ??= {};
  exif["0th"][TagValues.ImageIFD.ImageDescription] = JSON.stringify(generationMetadata);
  const newImage = insert(dump(exif), dataUri);
  out = toByteArray(newImage.substring(`data:image/jpeg;base64,`.length));

  return new Blob([out], { type: 'image/jpeg' });
}

export async function convertToPng(webp: Blob, generationMetadata: any): Promise<Blob> {
  return convertToPngSync(new Uint8Array(await webp.arrayBuffer()), generationMetadata);
}
export function convertToPngSync(webp: Uint8Array, generationMetadata: any): Blob {
  const memory = decodeWebP({
    data: webp,
  });
  let out = encodePng({
    image: memory!,
  });
  out = addMetadata(out, "generationMetadata", JSON.stringify(generationMetadata));
  return new Blob([out], { type: 'image/png' });
}
