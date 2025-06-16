import { SNSClient } from '@aws-sdk/client-sns';

export class SnsClientFactory {
  static create(): SNSClient {
    const isLocal = process.env.NODE_ENV === 'development' || process.env.AWS_ENDPOINT;
    
    return new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(isLocal && {
        endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
        }
      })
    });
  }
}