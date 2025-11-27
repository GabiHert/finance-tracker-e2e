#language: en
#utf-8

@all @FEATURE_TAG
Feature: FEATURE_NAME functionality

  Background:
    Given the tables are empty
    And the header is empty
    # TODO: Add environment variables
    #And the "ENV_VAR" env var is set to "value"
    
    # TODO: Add AWS secrets if needed
    #And the aws secret named "secret-name" exists with the following values
    #"""
    #{
    #  "KEY": "value"
    #}
    #"""
    
    # TODO: Add authorization headers if needed
    #And the header contains the key "Authorization" with "Bearer token"
    
    # TODO: Add external API mocks if needed
    #And the 0 "POST" request to "/oauth2/token" returns status 200 with the following response
    #"""
    #{
    #  "access_token": "token"
    #}
    #"""
    
    # TODO: Add test data if needed
    #And the "table_name" exists
    #"""
    #[
    #  {
    #    "id": "uuid",
    #    "field": "value"
    #  }
    #]
    #"""

  @FEATURE_TAG @contract_fields_validation
  Scenario Outline: ACTION failure - bad request
    When I call "METHOD" "/v1/ENDPOINT" with the following payload
    """
    {
        "field1": <field1>,
        "field2": <field2>
    }
    """
    Then the status returned should be 400
    And the response should contain the field "error.code" equal to "PREFIX-01400"
    And the response should contain the field "error.description" equal to "Bad request"
    And the response should contain the field "error.error_details.0.attribute" equal to "<attribute>"
    And the response should contain the field "error.error_details.0.messages.0" equal to "<message>"

    Examples:
      | field1  | field2  | attribute | message                    |
      | ""      | "valid" | field1    | REQUIRED_ATTRIBUTE_MISSING |
      | null    | "valid" | field1    | REQUIRED_ATTRIBUTE_MISSING |
      | "valid" | ""      | field2    | REQUIRED_ATTRIBUTE_MISSING |

  @FEATURE_TAG @success
  Scenario: ACTION success - minimal fields
    When I call "METHOD" "/v1/ENDPOINT" with the following payload
    """
    {
        "field1": "value1",
        "field2": "value2"
    }
    """
    Then the status returned should be STATUS_CODE
    And the response should contain the field "id" equal to "not nil"
    And the response should contain the field "field1" equal to "value1"
    # TODO: Add more response validations

  @FEATURE_TAG @success @database_validation
  Scenario: ACTION success - database validation
    When I call "METHOD" "/v1/ENDPOINT" with the following payload
    """
    {
        "field1": "value1",
        "field2": "value2"
    }
    """
    Then the status returned should be STATUS_CODE
    Then the db should contain 1 objects in the "table_name" table
    Then the db should contain 1 objects in "table_name" with the values
    """
    {
        "id": "not nil",
        "field1": "value1",
        "field2": "value2"
    }
    """

  # TODO: Add more scenarios as needed:
  # - Not found scenario (404)
  # - Duplicate/conflict scenario (409)
  # - Unauthorized scenario (401)
  # - External API integration scenarios
  # - Event publishing scenarios (SNS/SQS)
  # - List/pagination scenarios
