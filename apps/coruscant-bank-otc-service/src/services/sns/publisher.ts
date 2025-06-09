import { PublishCommand } from '@aws-sdk/client-sns';
import { snsClient } from '../../factories/snsClient';
import logger from '../../utils/logger';

/**
 * Generic SNS publisher class for publishing to any topic
 */
export class SNSPublisher {
  /**
   * Publish a message to any SNS topic
   */
  public async publish(topicName: string, message: Record<string, unknown>): Promise<string> {
    const topicArn = `arn:aws:sns:${process.env.AWS_REGION || 'us-east-1'}:000000000000:${topicName}`;

    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
    });

    const response = await snsClient.send(command);
    const messageId = response.MessageId || '';

    logger.debug({
      messageId,
      topicName,
    }, 'Message published to SNS topic');

    return messageId;
  }
}

