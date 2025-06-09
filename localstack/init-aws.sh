#!/bin/bash
set -euxo pipefail

export AWS_ACCESS_KEY_ID=000000000000 AWS_SECRET_ACCESS_KEY=000000000000

# Log AWS environment variables
echo "AWS environment variables:"
env | grep '^AWS_'

# Create SNS topic
echo "Creating SNS topic: coruscant-bank-loan-events"
aws --endpoint-url=http://localhost:4566 --region ${AWS_REGION} sns create-topic --name coruscant-bank-loan-events

# Create SQS queue
echo "Creating SQS queue: coruscant-bank-loan-queue"
aws --endpoint-url=http://localhost:4566 --region ${AWS_REGION} sqs create-queue --queue-name coruscant-bank-loan-queue

# Subscribe SQS queue to SNS topic
echo "Subscribing SQS queue to SNS topic"
TOPIC_ARN=$(aws --endpoint-url=http://localhost:4566 --region ${AWS_REGION} sns list-topics --query 'Topics[0].TopicArn' --output text)
echo "TOPIC_ARN=${TOPIC_ARN}"
QUEUE_URL=$(aws --endpoint-url=http://localhost:4566 --region ${AWS_REGION} sqs get-queue-url --queue-name coruscant-bank-loan-queue --query 'QueueUrl' --output text)
echo "QUEUE_URL=${QUEUE_URL}"
QUEUE_ARN=$(aws --endpoint-url=http://localhost:4566 --region ${AWS_REGION} sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
echo "QUEUE_ARN=${QUEUE_ARN}"

aws --endpoint-url=http://localhost:4566 --region ${AWS_REGION} sns subscribe \
    --topic-arn $TOPIC_ARN \
    --protocol sqs \
    --notification-endpoint $QUEUE_ARN

echo "LocalStack initialization complete!"
