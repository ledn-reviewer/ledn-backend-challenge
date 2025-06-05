Feature: Loan Application Processing
  As a client
  I want to submit loan applications
  So that I can get loans from Coruscant Bank

  Scenario: Successfully submit a valid loan application
    Given the Coruscant Bank OTC service is running
    When I submit a valid loan application
    Then I should receive a successful response
    And the loan event should be published to SNS

  Scenario: Submitting an invalid loan application
    Given the Coruscant Bank OTC service is running
    When I submit an invalid loan application
    Then I should receive a validation error

  Scenario: Successfully submit a collateral top-up
    Given the Coruscant Bank OTC service is running
    And I have an existing loan
    When I submit a valid collateral top-up
    Then I should receive a successful response
    And the collateral top-up event should be published to SNS
