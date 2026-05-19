import { Injectable, Logger } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { TypedConfigService } from '@config/typed-config.service';

export interface UploadInput {
  bucket: string;
  /** Logical key (path). The driver may prefix with bucket. */
  key: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}

export interface SignedUrlOptions {
  expiresInSeconds?: number;
}

/**
 * Storage abstraction.
 *
 * Driver selection via env:
 *   STORAGE_DRIVER=local    → writes under STORAGE_LOCAL_ROOT (default ./storage-data)
 *   STORAGE_DRIVER=s3       → AWS S3 / MinIO via @aws-sdk/client-s3
 *
 * Buckets used (logical):
 *   - payslips      → generated payslip PDFs
 *   - documents     → employee documents (passport, visa, etc.)
 *   - receipts      → expense receipts (OCR scans)
 *   - avatars       → user/employee profile photos
 *
 * Each bucket maps to:
 *   - local: a subdirectory of STORAGE_LOCAL_ROOT
 *   - s3:    the prefix `{S3_BUCKET_PREFIX}{bucket}` (or distinct buckets if
 *            configured per env — see `bucketName()` below).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 's3';
  private readonly localRoot: string;
  private readonly s3?: S3Client;
  private readonly s3BucketPrefix: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly config: TypedConfigService) {
    const env = process.env;
    this.driver = (env.STORAGE_DRIVER as 'local' | 's3') ?? 'local';
    this.localRoot = env.STORAGE_LOCAL_ROOT ?? path.resolve(process.cwd(), 'storage-data');
    this.s3BucketPrefix = env.S3_BUCKET_PREFIX ?? 'cg-payroll-';
    this.publicBaseUrl = env.STORAGE_PUBLIC_BASE_URL;
    if (this.driver === 's3') {
      this.s3 = new S3Client({
        region: env.S3_REGION ?? 'us-east-1',
        endpoint: env.S3_ENDPOINT, // for MinIO
        forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
        credentials:
          env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
            ? {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
              }
            : undefined,
      });
    }
    this.logger.log(`Storage driver = ${this.driver}`);
  }

  bucketName(bucket: string) {
    return `${this.s3BucketPrefix}${bucket}`;
  }

  /** Stable URL-safe key generator scoped to client/employee. */
  newKey(parts: string[], ext = ''): string {
    return `${parts.join('/')}/${randomUUID()}${ext ? `.${ext.replace(/^\./, '')}` : ''}`;
  }

  async upload(input: UploadInput): Promise<{ key: string; url: string }> {
    if (this.driver === 'local') {
      const full = path.join(this.localRoot, input.bucket, input.key);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, input.body);
      return { key: input.key, url: this.localPublicUrl(input.bucket, input.key) };
    }
    if (!this.s3) throw new Error('S3 client not initialised');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName(input.bucket),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { key: input.key, url: this.publicUrl(input.bucket, input.key) };
  }

  async getSignedDownloadUrl(
    bucket: string,
    key: string,
    opts: SignedUrlOptions = {},
  ): Promise<string> {
    const expiresIn = opts.expiresInSeconds ?? 300;
    if (this.driver === 'local') {
      // Local driver: just return the public URL since signed URLs aren't a thing.
      return this.localPublicUrl(bucket, key);
    }
    if (!this.s3) throw new Error('S3 client not initialised');
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
      { expiresIn },
    );
  }

  async delete(bucket: string, key: string): Promise<void> {
    if (this.driver === 'local') {
      const full = path.join(this.localRoot, bucket, key);
      try {
        await fs.unlink(full);
      } catch {
        // ignore — best effort
      }
      return;
    }
    if (!this.s3) return;
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
    );
  }

  // ─── URL helpers ──────────────────────────────────────────────────────

  private localPublicUrl(bucket: string, key: string): string {
    // The dev server doesn't serve these by default. The FE should fetch via
    // the /storage proxy that StorageController exposes.
    return `/api/v1/storage/files/${bucket}/${encodeURI(key)}`;
  }

  private publicUrl(bucket: string, key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${this.bucketName(bucket)}/${key}`;
    }
    return `s3://${this.bucketName(bucket)}/${key}`;
  }
}
