@comprehensive-integration
Feature: Comprehensive Integration Testing
  As a developer
  I want to test the complete service functionality
  So that I can ensure all major use cases work correctly

  Background:
    Given the Coruscant Bank OTC service is running in test mode

  Scenario: Full loan application workflow with self-publishing disabled
    Given self-publishing is disabled
    When I submit a valid loan application with all required fields
    Then I should receive a 202 response
    And the response should contain the request ID
    And the response should contain a timestamp
    And the response should indicate SNS publishing is disabled
    And the request should be marked as processed for idempotency

  Scenario: Full collateral top-up workflow
    Given I have an existing loan in the system
    When I submit a valid collateral top-up request
    Then I should receive a 202 response
    And the response should contain the request ID
    And the response should contain a timestamp
    And the collateral amount should be recorded correctly

  Scenario: Idempotency protection for loan applications
    Given I have a unique loan application request
    When I submit the loan application request
    Then I should receive a 202 response
    When I submit the exact same request again
    Then I should receive a 409 response
    And the response should indicate the request was already processed

  Scenario: Idempotency protection for collateral top-ups
    Given I have a unique collateral top-up request
    When I submit the collateral top-up request
    Then I should receive a 202 response
    When I submit the exact same request again
    Then I should receive a 409 response
    And the response should indicate the request was already processed

  Scenario: Input validation for loan applications
    When I submit a loan application with missing required fields
    Then I should receive a 400 response
    And the response should contain validation error details
    When I submit a loan application with invalid amount format
    Then I should receive a 400 response
    And the response should contain validation error details

  Scenario: Input validation for collateral top-ups
    When I submit a collateral top-up with missing required fields
    Then I should receive a 400 response
    And the response should contain validation error details
    When I submit a collateral top-up with invalid amount format
    Then I should receive a 400 response
    And the response should contain validation error details

  Scenario: Health check endpoint provides system status
    When I request the health check endpoint
    Then I should receive a 200 response
    And the response should contain system status
    And the response should contain event count
    And the response should contain SNS publishing configuration

  Scenario: Event history tracking and retrieval
    Given I have submitted multiple loan applications
    And I have submitted multiple collateral top-ups
    When I request the event history
    Then I should receive a 200 response
    And the response should contain all submitted events
    And the events should be properly formatted with timestamps

  Scenario: Event history filtering by type
    Given I have submitted loan applications and collateral top-ups
    When I request event history filtered by "LOAN_APPLICATION" type
    Then I should receive a 200 response
    And the response should only contain loan application events
    When I request event history filtered by "COLLATERAL_TOPUP" type
    Then I should receive a 200 response
    And the response should only contain collateral top-up events

  Scenario: Simulation control endpoints
    When I request the simulation status
    Then I should receive a 200 response
    And the response should contain simulation statistics
    When I start the client simulator
    Then I should receive a 200 response
    And the simulation should be marked as active
    When I stop the client simulator
    Then I should receive a 200 response
    And the simulation should be marked as inactive

  Scenario: Error handling for external service failures
    Given the liquidation service is unavailable
    When I submit a loan application
    Then I should receive a 202 response initially
    But the system should handle the forwarding failure gracefully
    And the error should be logged appropriately

  Scenario: Concurrent request handling
    Given I have multiple unique loan application requests
    When I submit all requests concurrently
    Then all requests should be processed successfully
    And each should receive a unique response
    And idempotency should be maintained across concurrent requests