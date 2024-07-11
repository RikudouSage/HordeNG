/// <reference lib="webworker" />

import {decodeWebP, encodePng} from "image-in-browser";
import {addMetadata} from "meta-png";

interface ConvertToPngData {
  data: ArrayBuffer;
  generationMetadata: any;
}

function convertToPng(data: ConvertToPngData): Blob {
  const webp = decodeWebP({
    data: new Uint8Array(data.data),
  });
  let out = encodePng({
    image: webp!,
  });
  out = addMetadata(out, "generationMetadata", JSON.stringify(data.generationMetadata));

  return new Blob([out], { type: 'image/png' });
}

addEventListener('message', ({ data }) => {
  let result: any;
  switch (data.type) {
    case 'convertToPng':
      result = convertToPng(data);
      break;
    default:
      console.error(`Unsupported type "${data.type}".`);
      return;
  }

  postMessage({
    type: data.type,
    result: result,
  });
});
