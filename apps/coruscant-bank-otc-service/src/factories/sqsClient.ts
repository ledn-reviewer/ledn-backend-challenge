import { SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '../config/aws';

/**
 * Factory function to create SQS client
 */
export const createSqsClient = (): SQSClient => {
  return new SQSClient(awsConfig);
};

// Singleton instance for application-wide use
export const sqsClient = createSqsClient();
