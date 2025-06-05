Feature: SNS-SQS Integration
  As a system integrator
  I want to verify SNS and SQS integration works correctly
  So that messages can be published to SNS and received via SQS

  Background:
    Given I have created an SNS topic
    And I have created an SQS queue
    And I have subscribed the SQS queue to the SNS topic
    And I have configured the queue policy to allow SNS to send messages

  Scenario: Publish message to SNS and receive via SQS
    Given I have a test payload with action "integration-test"
    When I publish the message to the SNS topic
    Then the message should be published successfully with a message ID
    When I receive messages from the SQS queue
    Then I should receive at least one message
    And the received message should contain the original payload
    And the message should be wrapped in SNS envelope format

  Scenario: Clean up resources after testing
    Given I have test resources created
    When I clean up the test environment
    Then the subscription should be deleted
    And the SNS topic should be deleted
    And the SQS queue should be deleted