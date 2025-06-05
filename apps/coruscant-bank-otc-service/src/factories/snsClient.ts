import { SNSClient } from '@aws-sdk/client-sns';
import { awsConfig } from '../config/aws';

/**
 * Factory function to create SNS client
 */
export const createSnsClient = (): SNSClient => {
  return new SNSClient(awsConfig);
};

// Singleton instance for application-wide use
export const snsClient = createSnsClient();
