import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validations'
import { withRateLimit, rateLimitConfig } from '@/lib/rateLimit'
import { handleApiError, ERROR_CODES, logError } from '@/lib/errorHandling'

async function registerHandler(req: NextRequest) {
  try {
    const body = await req.json()

    // Server-side validation using Zod schema
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ')

      return NextResponse.json(
        {
          error: 'Invalid input provided. Please check your data.',
          code: ERROR_CODES.INVALID_INPUT
        },
        { status: 400 }
      )
    }

    const { name, email, password } = validationResult.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      logError('register', 'Email already exists', { email })
      return NextResponse.json(
        {
          error: 'An account with this email already exists.',
          code: ERROR_CODES.EMAIL_ALREADY_EXISTS
        },
        { status: 400 }
      )
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        plan: 'free'
      }
    })

    return NextResponse.json(
      {
        message: 'User created successfully',
        userId: user.id
      },
      { status: 201 }
    )
  } catch (error) {
    // Use centralized error handling
    return handleApiError(
      error,
      'register_post',
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500
    )
  }
}

// Apply rate limiting: 5 registrations per hour per IP
export const POST = withRateLimit(
  registerHandler,
  rateLimitConfig.register
)
