import { SubscribeCommand } from '@aws-sdk/client-sns';
import { snsClient } from '../../factories/snsClient';
import { LOAN_EVENTS_TOPIC_ARN, LOAN_QUEUE_ARN } from '../../helpers/aws';
import logger from '../../utils/logger';

/**
 * Subscribe an SQS queue to the SNS topic
 */
export const subscribeSqsToSnsTopic = async (): Promise<string> => {
  try {
    const command = new SubscribeCommand({
      TopicArn: LOAN_EVENTS_TOPIC_ARN,
      Protocol: 'sqs',
      Endpoint: LOAN_QUEUE_ARN
    });

    const response = await snsClient.send(command);
    logger.info(
      { subscriptionArn: response.SubscriptionArn },
      'Successfully subscribed SQS queue to SNS topic'
    );
    return response.SubscriptionArn || '';
  } catch (error) {
    logger.error({ error }, 'Error subscribing SQS queue to SNS topic');
    throw error;
  }
};
