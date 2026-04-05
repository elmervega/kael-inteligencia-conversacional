import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? 'https://34f06b3855ce208f4c0fd7813355bc49@o4511168815955968.ingest.us.sentry.io/4511168820543488',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
