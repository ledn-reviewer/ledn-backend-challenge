import { DomainException } from '../../domain/exceptions/domain-exception';
import { RequestId } from '../../domain/value-objects/request-id';

export class ApplicationException extends DomainException {
  protected constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, context);
  }
}

export class DuplicateRequestException extends ApplicationException {
  constructor(requestId: RequestId) {
    super(
      `Request already processed: ${requestId.getValue()}`,
      'DUPLICATE_REQUEST',
      { requestId: requestId.getValue() }
    );
  }
}

export class ValidationException extends ApplicationException {
  constructor(field: string, value: unknown, reason: string) {
    super(
      `Validation failed for field '${field}': ${reason}`,
      'VALIDATION_ERROR',
      { field, value, reason }
    );
  }
}

export class ExternalServiceException extends ApplicationException {
  constructor(serviceName: string, operation: string, originalError: Error) {
    super(
      `External service '${serviceName}' failed during '${operation}': ${originalError.message}`,
      'EXTERNAL_SERVICE_ERROR',
      { serviceName, operation, originalError: originalError.message }
    );
  }
}