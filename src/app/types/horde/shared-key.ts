export interface SharedKey {
  id: string;
  username: string;
  name: string;
  kudos: number;
  expiry?: string;
  utilized: number;
  max_image_pixels: number;
  max_image_steps: number;
  max_text_tokens: number;
}
