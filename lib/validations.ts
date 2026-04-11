import { z } from 'zod'

/**
 * Email validation schema
 * Validates email format using RFC 5322 simplified rules
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be at most 255 characters')
  .toLowerCase()

/**
 * Password validation schema
 * Requires:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    'Password must contain at least one uppercase letter, one number, and one special character'
  )

/**
 * Name validation schema
 * Validates user name input
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters')
  .regex(
    /^[\p{L}\s'\-]+$/u,
    'Name can only contain letters, spaces, hyphens, and apostrophes'
  )
  .trim()

/**
 * Registration schema
 * Validates the complete registration form
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{7,20}$/, 'Número de teléfono inválido')
  .transform(v => v.replace(/[\s\-\(\)]/g, ''))
  .optional()

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Login schema
 * Validates login credentials
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Message schema
 * Validates user messages
 */
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message is too long')
    .trim(),
  userId: z.string().uuid('Invalid user ID'),
  channel: z.enum(['telegram', 'whatsapp', 'web']),
  audioFileId: z.string().optional()
})

export type MessageInput = z.infer<typeof messageSchema>

/**
 * Reminder schema
 * Validates reminder creation
 */
export const reminderSchema = z.object({
  title: z
    .string()
    .min(1, 'Reminder title cannot be empty')
    .max(500, 'Reminder title is too long')
    .trim(),
  scheduledAt: z
    .string()
    .datetime()
    .refine(
      (date) => new Date(date) > new Date(),
      'Reminder must be scheduled for a future time'
    ),
  channel: z.enum(['telegram', 'whatsapp', 'web']),
  userId: z.string().uuid('Invalid user ID')
})

export type ReminderInput = z.infer<typeof reminderSchema>

/**
 * Utility function to validate input safely
 * Returns { success: boolean, data: T | null, error: string | null }
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data: T | null; error: string | null } {
  try {
    const result = schema.safeParse(data)

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ')

      return {
        success: false,
        data: null,
        error: errorMessages
      }
    }

    return {
      success: true,
      data: result.data,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: 'Validation error occurred'
    }
  }
}

/**
 * Sanitize string input
 * Removes potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 5000) // Max length
    .replace(/[<>\"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }
      return escapeMap[match] || match
    })
}
