import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// AWS Configuration
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

// SNS/SQS Resource names
export const LOAN_EVENTS_TOPIC = process.env.LOAN_EVENTS_TOPIC || 'coruscant-bank-loan-events';
export const LOAN_QUEUE_NAME = process.env.LOAN_QUEUE_NAME || 'coruscant-bank-loan-queue';

// Feature flags
export const isSelfPublishingEnabled = (): boolean => process.env.ENABLE_SELF_PUBLISHING === 'true';
