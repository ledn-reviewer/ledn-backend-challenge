import { awsConfig, LOAN_EVENTS_TOPIC, LOAN_QUEUE_NAME } from '../config/aws';

/**
 * Construct ARNs and URLs for AWS resources
 */

// Construct ARNs (for local development with LocalStack)
export const constructTopicArn = (topicName: string): string => {
  return `arn:aws:sns:${awsConfig.region}:000000000000:${topicName}`;
};

export const constructQueueArn = (queueName: string): string => {
  return `arn:aws:sqs:${awsConfig.region}:000000000000:${queueName}`;
};

export const constructQueueUrl = (queueName: string): string => {
  const endpoint = awsConfig.endpoint || `https://sqs.${awsConfig.region}.amazonaws.com`;
  return `${endpoint}/000000000000/${queueName}`;
};

// Constructed ARNs and URLs
export const LOAN_EVENTS_TOPIC_ARN = constructTopicArn(LOAN_EVENTS_TOPIC);
export const LOAN_QUEUE_ARN = constructQueueArn(LOAN_QUEUE_NAME);
export const LOAN_QUEUE_URL = constructQueueUrl(LOAN_QUEUE_NAME);
