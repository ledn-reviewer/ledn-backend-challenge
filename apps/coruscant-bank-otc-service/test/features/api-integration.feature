@api-integration
Feature: API Integration Testing
  As a system integrator
  I want to test the complete API functionality
  So that I can ensure all endpoints work correctly

  Background:
    Given the Coruscant Bank OTC service is running
    And the liquidation service is available

  Scenario: Successfully submit a valid loan application
    Given I have a valid loan application payload
    When I submit the loan application to "/api/loan-applications"
    Then I should receive a 202 response
    And the response should contain a request ID
    And the response should contain a timestamp
    And the response should indicate if SNS publishing is enabled
    And the loan application should be forwarded to the liquidation service

  Scenario: Submit loan application with missing required fields
    Given I have an invalid loan application payload missing required fields
    When I submit the loan application to "/api/loan-applications"
    Then I should receive a 400 response
    And the response should contain validation errors

  Scenario: Submit duplicate loan application (idempotency test)
    Given I have a valid loan application payload
    When I submit the loan application to "/api/loan-applications"
    Then I should receive a 202 response
    When I submit the same loan application again
    Then I should receive a 409 response
    And the response should indicate the request was already processed

  Scenario: Successfully submit a valid collateral top-up
    Given I have a valid collateral top-up payload
    When I submit the collateral top-up to "/api/collateral-top-ups"
    Then I should receive a 202 response
    And the response should contain a request ID
    And the response should contain a timestamp
    And the collateral top-up should be forwarded to the liquidation service

  Scenario: Submit collateral top-up with invalid data
    Given I have an invalid collateral top-up payload
    When I submit the collateral top-up to "/api/collateral-top-ups"
    Then I should receive a 400 response
    And the response should contain validation errors

  Scenario: Health check endpoint returns system status
    When I request the health check endpoint "/api/health"
    Then I should receive a 200 response
    And the response should contain the system status
    And the response should contain the event count
    And the response should indicate SNS publishing status

  Scenario: Events endpoint returns stored events
    Given I have submitted some loan applications
    When I request the events endpoint "/api/events"
    Then I should receive a 200 response
    And the response should contain the list of events

  Scenario: Event history endpoint with filters
    Given I have submitted various events
    When I request event history with type filter "LOAN_APPLICATION"
    Then I should receive a 200 response
    And the response should only contain loan application events
    When I request event history with direction filter "OUTBOUND"
    Then I should receive a 200 response
    And the response should only contain outbound events