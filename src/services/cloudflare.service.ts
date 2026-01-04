import axios from "axios";
import FormData from "form-data";

export class CloudflareService {
  private accountId: string;
  private apiToken: string;
  private deliveryDomain: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
    this.deliveryDomain = process.env.CLOUDFLARE_IMAGE_DELIVERY_DOMAIN || "";
  }

  async uploadImage(fileBuffer: Buffer, fileName: string): Promise<string> {
    if (!this.accountId || !this.apiToken) {
      console.warn("Cloudflare credentials not configured. Returning mock URL.");
      return `https://mock-image-url.com/${fileName}`;
    }

    try {
      const formData = new FormData();
      formData.append("file", fileBuffer, fileName);

      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/images/v1`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            ...formData.getHeaders(),
          },
        }
      );

      if (response.data.success) {
        // Prefer the variant URL if available, or construct using delivery domain
        // Cloudflare typically returns: result: { variants: [url1, url2] }
        // We will stick to the 'public' variant usually or the first one.
        const variants = response.data.result.variants;
        if (variants && variants.length > 0) {
            return variants[0];
        }
        return `https://${this.deliveryDomain}/${response.data.result.id}/public`;
      } else {
        throw new Error("Cloudflare upload failed: " + JSON.stringify(response.data.errors));
      }
    } catch (error) {
      console.error("Cloudflare upload error:", error);
      throw new Error("Failed to upload image to Cloudflare");
    }
  }
}
