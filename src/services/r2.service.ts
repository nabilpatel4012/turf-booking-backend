import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';


// R2 Configuration
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL!, // e.g., https://images.yourdomain.com
};

export interface UploadOptions {
  venueId?: string;
  file: Buffer;
  fileName: string;
  contentType: string;
  isLogo?: boolean;
}

export class R2Service {
  private r2Client: S3Client;

  constructor() {
    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
    });
  }

  /**
   * Generate a unique file path for organizing images in R2
   */
  private generateFilePath(fileName: string, venueId?: string, isLogo: boolean = false): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (venueId) {
      const folder = isLogo ? 'logos' : 'images';
      return `venues/${venueId}/${folder}/${timestamp}-${sanitized}`;
    }
    
    // Generic uploads fallback
    return `uploads/${timestamp}-${sanitized}`;
  }

  /**
   * Upload image directly to R2 (server-side)
   */
  async uploadImage(options: UploadOptions): Promise<string> {
    const { venueId, file, fileName, contentType, isLogo = false } = options;
    
    // Ensure credentials are present before attempting upload
    if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
        console.warn("R2 credentials not configured. Returning mock URL.");
        return `https://mock-r2-image.com/${fileName}`;
    }

    const filePath = this.generateFilePath(fileName, venueId, isLogo);
    
    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: filePath,
      Body: file,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
      Metadata: {
        ...(venueId && { venueId }),
        uploadedAt: new Date().toISOString(),
      },
    });
    
    try {
      await this.r2Client.send(command);
      return `${R2_CONFIG.publicUrl}/${filePath}`;
    } catch (error) {
      console.error("R2 Upload error:", error);
      throw new Error("Failed to upload image to R2");
    }
  }

  /**
   * Delete image from R2
   */
  async deleteImage(fileUrl: string): Promise<void> {
    const fileKey = fileUrl.replace(`${R2_CONFIG.publicUrl}/`, '');
    
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileKey,
    });
    
    try {
      await this.r2Client.send(command);
    } catch (error) {
       console.error("R2 Delete error:", error);
       // We might not want to throw here if we want to be soft on delete failures
       throw new Error("Failed to delete image from R2");
    }
  }

  // Removed generatePresignedUploadUrl as we are doing direct server-side upload only.
}
