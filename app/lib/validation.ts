import { CreatePollRequest, EditPollFormData } from '@/app/types'

/**
 * Input validation utilities for poll operations
 * Encapsulates all validation logic for poll-related data
 */

export interface ValidationError {
  field: string
  message: string
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: ValidationError[] = []
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate poll title
 */
export function validatePollTitle(title: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!title || title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Poll title is required'
    })
  } else if (title.trim().length < 3) {
    errors.push({
      field: 'title',
      message: 'Poll title must be at least 3 characters long'
    })
  } else if (title.trim().length > 200) {
    errors.push({
      field: 'title',
      message: 'Poll title must be less than 200 characters'
    })
  }

  return errors
}

/**
 * Validate poll description
 */
export function validatePollDescription(description?: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (description && description.trim().length > 1000) {
    errors.push({
      field: 'description',
      message: 'Poll description must be less than 1000 characters'
    })
  }

  return errors
}

/**
 * Validate poll options
 */
export function validatePollOptions(options: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  if (!options || options.length === 0) {
    errors.push({
      field: 'options',
      message: 'At least one poll option is required'
    })
  } else if (options.length < 2) {
    errors.push({
      field: 'options',
      message: 'At least two poll options are required'
    })
  } else if (options.length > 10) {
    errors.push({
      field: 'options',
      message: 'Maximum 10 poll options allowed'
    })
  } else {
    // Validate individual options
    options.forEach((option, index) => {
      if (!option || option.trim().length === 0) {
        errors.push({
          field: `options[${index}]`,
          message: 'Poll option cannot be empty'
        })
      } else if (option.trim().length > 100) {
        errors.push({
          field: `options[${index}]`,
          message: 'Poll option must be less than 100 characters'
        })
      }
    })

    // Check for duplicate options
    const uniqueOptions = new Set(options.map(opt => opt.trim().toLowerCase()))
    if (uniqueOptions.size !== options.length) {
      errors.push({
        field: 'options',
        message: 'Poll options must be unique'
      })
    }
  }

  return errors
}

/**
 * Validate expiration date
 */
export function validateExpirationDate(expiresAt?: Date): ValidationError[] {
  const errors: ValidationError[] = []

  if (expiresAt) {
    const now = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(now.getFullYear() + 1)

    if (expiresAt <= now) {
      errors.push({
        field: 'expiresAt',
        message: 'Expiration date must be in the future'
      })
    } else if (expiresAt > oneYearFromNow) {
      errors.push({
        field: 'expiresAt',
        message: 'Expiration date cannot be more than one year in the future'
      })
    }
  }

  return errors
}

/**
 * Validate poll ID
 */
export function validatePollId(id: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!id || id.trim().length === 0) {
    errors.push({
      field: 'id',
      message: 'Poll ID is required'
    })
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
    errors.push({
      field: 'id',
      message: 'Invalid poll ID format'
    })
  }

  return errors
}

/**
 * Validate option ID
 */
export function validateOptionId(id: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!id || id.trim().length === 0) {
    errors.push({
      field: 'optionId',
      message: 'Option ID is required'
    })
  } else if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
    errors.push({
      field: 'optionId',
      message: 'Invalid option ID format'
    })
  }

  return errors
}

/**
 * Validate create poll request
 */
export function validateCreatePollRequest(data: CreatePollRequest): void {
  const errors: ValidationError[] = [
    ...validatePollTitle(data.title),
    ...validatePollDescription(data.description),
    ...validatePollOptions(data.options),
    ...validateExpirationDate(data.expiresAt)
  ]

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
}

/**
 * Validate edit poll form data
 */
export function validateEditPollFormData(data: EditPollFormData): void {
  const errors: ValidationError[] = [
    ...validatePollTitle(data.title),
    ...validatePollDescription(data.description),
    ...validatePollOptions(data.options.map(opt => opt.text))
  ]

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors)
  }
}
