@self-contained-integration
Feature: Self-Contained Integration Testing
  As a developer testing the OTC service
  I want to verify core functionality without external dependencies
  So that integration tests can run reliably in isolation

  Background:
    Given the OTC service is running without external dependencies

  Scenario: Complete loan application processing workflow
    When I submit a complete loan application
    Then the loan application should be accepted
    And the response should include processing confirmation
    And the event should be logged internally

  Scenario: Complete collateral top-up processing workflow
    When I submit a complete collateral top-up request
    Then the collateral top-up should be accepted
    And the response should include processing confirmation
    And the event should be logged internally

  Scenario: Request idempotency validation
    Given I have a loan application with unique request ID
    When I submit the loan application
    Then the application should be accepted
    When I submit the same loan application again
    Then the duplicate should be rejected with conflict status

  Scenario: Input validation for required fields
    When I submit a loan application missing required fields
    Then the application should be rejected with validation errors
    When I submit a collateral top-up missing required fields
    Then the top-up should be rejected with validation errors

  Scenario: Service health and monitoring endpoints
    When I check the service health endpoint
    Then the health check should return service status
    And the health check should include event statistics
    When I check the event history endpoint
    Then the event history should be accessible
    And the event history should contain recent events

  Scenario: Simulation control functionality
    When I request simulation statistics
    Then the simulation stats should be available
    When I control the simulation state
    Then the simulation should respond to control commands