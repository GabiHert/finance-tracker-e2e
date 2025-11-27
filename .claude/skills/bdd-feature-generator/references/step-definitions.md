# Step Definitions Reference

## Setup Steps (Given)

### Environment Configuration
```gherkin
Given the tables are empty
Given the header is empty
Given the "ENV_VAR_NAME" env var is set to "value"
Given the "ENV_VAR_NAME" env var is set to the mocked api url
```

### AWS Secret Configuration
```gherkin
Given the aws secret named "secret-name" exists with the following values
"""
{
  "KEY1": "value1",
  "KEY2": "value2"
}
"""
```

### Header Configuration
```gherkin
Given the header contains the key "Authorization" with "Bearer token..."
```

### Database Setup
```gherkin
Given the "table_name" exists
"""
[
  {
    "id": "uuid",
    "field1": "value1",
    "field2": "value2"
  }
]
"""
```

### External API Mock Responses
```gherkin
Given the 0 "METHOD" request to "/path" returns status 200 with the following response
"""
{
  "field": "value"
}
"""

Given the "METHOD" "path" should not return any results
```

### AWS Rekognition Mock
```gherkin
Given aws rekognition returns the following response
"""
{
  "approve": true,
  "matches": [
    {
      "similarity": 99.5,
      "user_id": "uuid"
    }
  ]
}
"""
```

### DynamoDB Setup
```gherkin
Given the dynamodb table "table-name" with key "key-name" exists
```

## Action Steps (When)

### HTTP Requests
```gherkin
When I call "METHOD" "path" with the following payload
"""
{
  "field": "value"
}
"""

When I call "METHOD" "path" with the following csv payload
"""
header1,header2
value1,value2
"""

When I call "METHOD" "path" with multipart form data
"""
{
  "field1": "value1",
  "file_field": "filename.jpg"
}
"""
```

### Event Processing
```gherkin
When the following event is received via dynamodb stream
"""
{
  "field": "value"
}
"""

When the following event is received via sns
"""
{
  "field": "value"
}
"""

When the following event is received via sqs
"""
{
  "field": "value"
}
"""
```

## Assertion Steps (Then)

### HTTP Response Validation
```gherkin
Then the status returned should be 200
Then the response should contain the field "field.nested.path" equal to "value"
Then the response should contain the field "field.array.0.id" equal to "value"
Then the response should contain the field "field" equal to "not nil"
Then the response should contain the field "field" equal to "nil"
Then the response should contain the field "array.field" array length equal to 5
Then the response should contain the text
"""
Expected text content
"""
Then the response should not be nil
```

### Database Validation
```gherkin
Then the db should contain 1 objects in the "table_name" table
Then the db should contain 1 objects in "table_name" with the values
"""
{
  "id": "not nil",
  "field1": "value1",
  "field2": "value2"
}
"""

Then the db should contain 1 objects in "table_name" with the "column1,column2" columns with values "value1,value2"

Then the db should contain the "entity_name" with the id "uuid" colum "column_name" equal to "value"
Then the db should contain the "entity_name" with the "column_name" column value "value" colum "other_column" equal to "value"
Then the db should contain the "entity_name" with the id "uuid" array colum "array_column" length is 5

Then the db should contain the "entity_name" with the colum "column_name" equal to "value" for the following where parameters
"""
{
  "field1": "value1",
  "field2": "value2"
}
"""
```

### SNS Event Validation
```gherkin
Then the sns topic "arn:aws:sns:region:account:topic" should have 1 messages published
Then the sns topic "arn:aws:sns:region:account:topic" should have a message published with "field.path" field equal to "value"
Then the sns topic "arn:aws:sns:region:account:topic" should have a message published with "field" field equal to "not nil"
```

### External API Request Validation
```gherkin
Then the 0 "METHOD" request for "path" headers should have the variable "Header-Name" with value "value"
Then the 0 "METHOD" request for "path" queries should have the variable "param" with value "value"
Then the 0 "METHOD" request for "path" json body should have the variable "field.path" with value "value"
Then the 0 "METHOD" request for "path" json body should have the variable "field" with value "not nil"
```

### Lambda Validation
```gherkin
Then the lambda should finish without errors
Then the lambda should finish with "error message" error
```
