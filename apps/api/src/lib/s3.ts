/**
 * S3 Service
 * File upload utilities for AWS S3
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from './logger';

// Initialize S3 client
const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a file buffer to S3 with timeout
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  const bucket = env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  logger.info(
    {
      bucket,
      key,
      contentType,
      size: buffer.length,
      region: env.AWS_REGION,
      hasCredentials: !!(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY),
    },
    '[S3] Starting upload'
  );

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn('[S3] Upload timeout - aborting after 30 seconds');
    abortController.abort();
  }, 30000);

  try {
    logger.debug('[S3] Sending command to AWS...');
    const result = await s3Client.send(command, { abortSignal: abortController.signal });
    clearTimeout(timeoutId);
    logger.info({ key, etag: result.ETag }, '[S3] Upload successful');
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Check if it was aborted due to timeout
    if (abortController.signal.aborted) {
      logger.error({ bucket, key }, '[S3] Upload timed out after 30 seconds');
      throw new Error(
        'S3 upload timed out. Please check your network connection and AWS credentials.'
      );
    }

    // Log detailed AWS error information
    const awsError = error as {
      name?: string;
      message?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number };
      $fault?: string;
      $service?: string;
    };
    logger.error(
      {
        errorName: awsError.name,
        errorMessage: awsError.message,
        errorCode: awsError.Code,
        httpStatus: awsError.$metadata?.httpStatusCode,
        fault: awsError.$fault,
        service: awsError.$service,
        bucket,
        key,
      },
      '[S3] Upload failed'
    );
    throw new Error(
      `S3 upload failed: ${awsError.Code || awsError.name || 'Unknown error'} - ${awsError.message || 'No details'}`
    );
  }

  // Construct the URL
  const url = env.CDN_URL
    ? `${env.CDN_URL}/${key}`
    : `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;

  return { key, url };
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const bucket = env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate a presigned URL for direct upload from client
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300 // 5 minutes
): Promise<string> {
  const bucket = env.S3_BUCKET_NAME;

  if (!bucket) {
    throw new Error('S3_BUCKET_NAME is not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a unique key for tenant logos (public folder)
 */
export function generateLogoKey(tenantId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'png';
  const timestamp = Date.now();
  return `public/tenants/${tenantId}/logo-${timestamp}.${ext}`;
}

/**
 * Generate a key for private files (invoices, documents, etc.)
 */
export function generatePrivateKey(
  tenantId: string,
  folder: 'invoices' | 'documents' | 'reports',
  filename: string,
  branchId?: string
): string {
  const timestamp = Date.now();
  const basePath = branchId
    ? `private/${folder}/${tenantId}/${branchId}`
    : `private/${folder}/${tenantId}`;
  return `${basePath}/${timestamp}-${filename}`;
}

/**
 * Get the public URL for an S3 key
 */
export function getPublicUrl(key: string): string {
  const bucket = env.S3_BUCKET_NAME;

  if (env.CDN_URL) {
    return `${env.CDN_URL}/${key}`;
  }

  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
