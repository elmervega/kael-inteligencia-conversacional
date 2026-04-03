import { NextResponse } from 'next/server'

/**
 * Safe error response for client
 * Logs full error internally but returns generic message to client
 */

export interface ErrorResponse {
  error: string
  code?: string
  details?: Record<string, unknown>
}

/**
 * Error codes for different scenarios
 */
export const ERROR_CODES = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  EMAIL_INVALID: 'EMAIL_INVALID',
  PASSWORD_WEAK: 'PASSWORD_WEAK',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Server errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Not found
  NOT_FOUND: 'NOT_FOUND'
} as const

/**
 * Get safe error message to send to client
 * Never expose internal details, stack traces, or sensitive info
 */
export function getSafeErrorMessage(
  code: string,
  originalError?: unknown
): string {
  const safeMessages: Record<string, string> = {
    [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided. Please check your data.',
    [ERROR_CODES.MISSING_FIELD]: 'Required field is missing.',
    [ERROR_CODES.EMAIL_INVALID]: 'Please provide a valid email address.',
    [ERROR_CODES.PASSWORD_WEAK]: 'Password does not meet security requirements.',
    [ERROR_CODES.UNAUTHORIZED]: 'You are not authorized to perform this action.',
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password.',
    [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
    [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
    [ERROR_CODES.DATABASE_ERROR]: 'A database error occurred. Please try again later.',
    [ERROR_CODES.EXTERNAL_API_ERROR]: 'An external service is temporarily unavailable.',
    [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again.',
    [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please try again later.',
    [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.'
  }

  return safeMessages[code] || 'An error occurred. Please try again later.'
}

/**
 * Log error safely
 * Never logs sensitive information
 */
export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  // Log to console (will be captured by server logging)
  console.error(`[${timestamp}] [ERROR] ${context}`, {
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
    ...metadata
  })

  // In production, you might send to external logging service:
  // await sendToSentryOrLoggingService({ context, errorMessage, metadata })
}

/**
 * Handle API errors safely
 * Returns appropriate HTTP response without exposing sensitive info
 */
export async function handleApiError(
  error: unknown,
  context: string,
  defaultCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
  statusCode: number = 500
): Promise<NextResponse<ErrorResponse>> {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Log the full error internally
  logError(context, error, {
    statusCode,
    errorCode: defaultCode
  })

  // Check for specific error types
  let code = defaultCode
  let clientStatusCode = statusCode

  if (error instanceof Error) {
    if (error.message.includes('unique constraint')) {
      code = ERROR_CODES.EMAIL_ALREADY_EXISTS
      clientStatusCode = 400
    } else if (error.message.includes('not found')) {
      code = ERROR_CODES.NOT_FOUND
      clientStatusCode = 404
    } else if (error.message.includes('unauthorized')) {
      code = ERROR_CODES.UNAUTHORIZED
      clientStatusCode = 401
    }
  }

  // Return safe error response
  return NextResponse.json(
    {
      error: getSafeErrorMessage(code, error),
      code
    },
    { status: clientStatusCode }
  )
}

/**
 * Validation error response
 */
export function validationError(
  message: string = 'Validation failed'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ERROR_CODES.INVALID_INPUT
    },
    { status: 400 }
  )
}

/**
 * Unauthorized error response
 */
export function unauthorizedError(
  message: string = 'Unauthorized'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ERROR_CODES.UNAUTHORIZED
    },
    { status: 401 }
  )
}

/**
 * Not found error response
 */
export function notFoundError(
  message: string = 'Resource not found'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: ERROR_CODES.NOT_FOUND
    },
    { status: 404 }
  )
}

/**
 * Rate limit error response
 */
export function rateLimitError(
  retryAfter?: number
): NextResponse<ErrorResponse> {
  const response = NextResponse.json(
    {
      error: getSafeErrorMessage(ERROR_CODES.RATE_LIMITED),
      code: ERROR_CODES.RATE_LIMITED
    },
    { status: 429 }
  )

  if (retryAfter) {
    response.headers.set('Retry-After', String(Math.ceil(retryAfter / 1000)))
  }

  return response
}

/**
 * Safely extract error details for logging
 * Removes sensitive information
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name
      // Explicitly NOT including stack in safe mode
    }
  }

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    return {
      type: typeof error,
      keys: Object.keys(obj).slice(0, 10) // First 10 keys only
    }
  }

  return {
    type: typeof error,
    value: String(error).slice(0, 100) // First 100 chars only
  }
}
