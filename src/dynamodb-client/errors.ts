/**
 * Base error type for all DynamoDB related issues raised by this library.
 */
export class DynamoDBError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code = "DynamoDBError", cause?: unknown) {
    super(message);
    this.name = code;
    this.code = code;
    this.cause = cause;
  }
}

/** Input validation failure. */
export class ValidationError extends DynamoDBError {
  constructor(message: string) {
    super(message, "ValidationError");
  }
}

/** Item not found error. */
export class NotFoundError extends DynamoDBError {
  constructor(message: string) {
    super(message, "NotFoundError");
  }
}

/** Conditional check failed error. */
export class ConditionalCheckFailedError extends DynamoDBError {
  constructor(message: string, cause?: unknown) {
    super(message, "ConditionalCheckFailedError", cause);
  }
}

/** Error raised when marshalling/unmarshalling fails. */
export class SerializationError extends DynamoDBError {
  constructor(message: string, cause?: unknown) {
    super(message, "SerializationError", cause);
  }
}

/** Wrapper for unknown AWS service errors. */
export class ServiceError extends DynamoDBError {
  constructor(message: string, cause?: unknown) {
    super(message, "ServiceError", cause);
  }
}
