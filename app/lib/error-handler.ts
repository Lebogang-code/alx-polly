/**
 * Standardized error response handling
 * Provides consistent error formatting across all poll operations
 */

export interface ApiError {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: string
}

export interface ApiSuccess<T = any> {
  success: true
  data: T
  timestamp: string
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError

export class PollOperationError extends Error {
  constructor(
    message: string,
    public code: string = 'POLL_OPERATION_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'PollOperationError'
  }
}

export class NetworkError extends PollOperationError {
  constructor(message: string = 'Network request failed', details?: any) {
    super(message, 'NETWORK_ERROR', details)
  }
}

export class AuthenticationError extends PollOperationError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', details)
  }
}

export class ValidationError extends PollOperationError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 'VALIDATION_ERROR', details)
  }
}

export class NotFoundError extends PollOperationError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND_ERROR', details)
  }
}

export class PermissionError extends PollOperationError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, 'PERMISSION_ERROR', details)
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: any
): ApiError {
  return {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * Handle and standardize errors from API responses
 */
export function handleApiError(response: Response, errorData?: any): never {
  const status = response.status
  
  switch (status) {
    case 401:
      throw new AuthenticationError(
        errorData?.error || 'Authentication required'
      )
    case 403:
      throw new PermissionError(
        errorData?.error || 'Insufficient permissions'
      )
    case 404:
      throw new NotFoundError(
        errorData?.error || 'Resource not found'
      )
    case 422:
      throw new ValidationError(
        errorData?.error || 'Validation failed',
        errorData?.details
      )
    case 500:
      throw new PollOperationError(
        errorData?.error || 'Internal server error',
        'SERVER_ERROR'
      )
    default:
      throw new PollOperationError(
        errorData?.error || `Request failed with status ${status}`,
        'UNKNOWN_ERROR'
      )
  }
}

/**
 * Handle network errors
 */
export function handleNetworkError(error: any): never {
  if (error instanceof PollOperationError) {
    throw error
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new NetworkError('Network request failed')
  }
  
  throw new PollOperationError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR'
  )
}
