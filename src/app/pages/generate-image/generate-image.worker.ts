/// <reference lib="webworker" />

import {convertToJpegSync, convertToPngSync} from "../../helper/image-converter";

interface ConvertFormatData {
  data: ArrayBuffer;
  generationMetadata: any;
}

addEventListener('message', ({ data }) => {
  let result: any;
  switch (data.type) {
    case 'convertToPng':
      result = convertToPngSync(new Uint8Array((<ConvertFormatData>data).data), data.generationMetadata);
      break;
    case 'convertToJpeg':
      result = convertToJpegSync(new Uint8Array((<ConvertFormatData>data).data), data.generationMetadata);
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
