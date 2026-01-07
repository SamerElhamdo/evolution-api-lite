/**
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ @filename use-multi-file-auth-state-r2.ts                                    │
 * │ Cloudflare R2 Session Storage for WhatsApp Authentication                    │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ Stores WhatsApp sessions in Cloudflare R2 (S3-compatible)                   │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */

import { ConfigService, S3 } from '@config/env.config';
import { Logger } from '@config/logger.config';
import { AuthenticationCreds, AuthenticationState, BufferJSON, initAuthCreds, proto, SignalDataTypeMap } from 'baileys';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export type AuthState = { state: AuthenticationState; saveCreds: () => Promise<void> };

const logger = new Logger('R2AuthState');

// Initialize R2 S3 Client
const getR2Client = (): S3Client | null => {
  const config = new ConfigService().get<S3>('S3');
  
  if (!config?.ENABLE) {
    return null;
  }

  // R2 uses S3-compatible API
  // R2 endpoint format: {account_id}.r2.cloudflarestorage.com
  const endpoint = config.ENDPOINT.includes('://') 
    ? config.ENDPOINT 
    : (config.USE_SSL ? `https://${config.ENDPOINT}` : `http://${config.ENDPOINT}${config.PORT ? `:${config.PORT}` : ''}`);

  return new S3Client({
    region: config.REGION || 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: config.ACCESS_KEY,
      secretAccessKey: config.SECRET_KEY,
    },
    forcePathStyle: true, // Required for R2
  });
};

const getBucketName = (): string => {
  return new ConfigService().get<S3>('S3')?.BUCKET_NAME || '';
};

// Helper to get object key for a session file
const getObjectKey = (sessionId: string, key: string): string => {
  return `sessions/${sessionId}/${key}.json`;
};

export async function useMultiFileAuthStateR2(
  sessionId: string,
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const r2Client = getR2Client();
  const bucketName = getBucketName();

  if (!r2Client || !bucketName) {
    throw new Error('R2 client not configured. Please set S3_ENABLED=true and configure R2 credentials.');
  }

  const writeData = async (data: any, key: string): Promise<void> => {
    try {
      const jsonData = JSON.stringify(data, BufferJSON.replacer);
      const objectKey = getObjectKey(sessionId, key);
      
      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: jsonData,
          ContentType: 'application/json',
        })
      );
    } catch (error: any) {
      logger.error(['Failed to write data to R2', key, error?.message, error?.stack]);
      throw error;
    }
  };

  const readData = async (key: string): Promise<any> => {
    try {
      const objectKey = getObjectKey(sessionId, key);
      
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await r2Client.send(command);
      
      if (!response.Body) {
        return null;
      }

      // Convert stream to string
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      const bodyString = Buffer.concat(chunks).toString('utf-8');
      return JSON.parse(bodyString, BufferJSON.reviver);
    } catch (error: any) {
      // File doesn't exist - return null
      if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      logger.error(['Failed to read data from R2', key, error?.message]);
      return null;
    }
  };

  const removeData = async (key: string): Promise<void> => {
    try {
      const objectKey = getObjectKey(sessionId, key);
      
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        })
      );
    } catch (error: any) {
      logger.error(['Failed to delete data from R2', key, error?.message]);
    }
  };

  // Load or initialize credentials
  let creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();
  
  // Save initial creds if they were just created
  if (!(await readData('creds'))) {
    await writeData(creds, 'creds');
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids: string[]) => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const data: { [_: string]: SignalDataTypeMap[type] } = {};
          
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }),
          );

          return data;
        },
        set: async (data: any) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }

          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      return await writeData(creds, 'creds');
    },
  };
}

// Helper function to list all sessions in R2
export async function listR2Sessions(): Promise<string[]> {
  const r2Client = getR2Client();
  const bucketName = getBucketName();

  if (!r2Client || !bucketName) {
    return [];
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'sessions/',
      Delimiter: '/',
    });

    const response = await r2Client.send(command);
    const sessions: string[] = [];

    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          // Extract session ID from prefix like "sessions/session-id/"
          const match = prefix.Prefix.match(/sessions\/([^\/]+)\//);
          if (match && match[1]) {
            sessions.push(match[1]);
          }
        }
      }
    }

    return sessions;
  } catch (error: any) {
    logger.error(['Failed to list sessions from R2', error?.message]);
    return [];
  }
}

// Helper function to delete a session from R2
export async function deleteR2Session(sessionId: string): Promise<void> {
  const r2Client = getR2Client();
  const bucketName = getBucketName();

  if (!r2Client || !bucketName) {
    return;
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `sessions/${sessionId}/`,
    });

    const response = await r2Client.send(command);
    
    if (response.Contents && response.Contents.length > 0) {
      const deletePromises = response.Contents.map((object) =>
        r2Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: object.Key || '',
          })
        )
      );
      
      await Promise.all(deletePromises);
      logger.info(`Deleted session ${sessionId} from R2 (${response.Contents.length} files)`);
    }
  } catch (error: any) {
    logger.error(['Failed to delete session from R2', sessionId, error?.message]);
    throw error;
  }
}

