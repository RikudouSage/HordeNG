import {QrCodeComponentValue} from "../pages/generate-image/parts/qr-code-form/qr-code-form.component";

/**
 * Can parse both a JSON string and the previously used raw string into the expected value
 */
export function parseQrCodeFromRawValue(raw: string | undefined | null): QrCodeComponentValue | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as QrCodeComponentValue;
  } catch (e) {
    return {
      text: raw,
      markersPrompt: null,
      positionY: null,
      positionX: null,
    };
  }
}
