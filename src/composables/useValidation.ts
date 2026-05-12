// Reusable form validation rules for reactive forms across the app.
// Usage: const v = useValidation(); v.required(value) returns '' (valid) or an error string.

export function useValidation() {
  const required = (value: unknown, label = 'This field') => {
    if (value === null || value === undefined) return `${label} is required.`
    if (typeof value === 'string' && value.trim() === '') return `${label} is required.`
    if (Array.isArray(value) && value.length === 0) return `${label} is required.`
    return ''
  }

  const email = (value: string) => {
    if (!value) return ''
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Invalid email address.'
  }

  const minLength = (min: number) => (value: string) => {
    if (!value) return ''
    return value.length >= min ? '' : `Must be at least ${min} characters.`
  }

  const minValue = (min: number, label = 'Value') => (value: number | string) => {
    const n = Number(value)
    if (isNaN(n)) return `${label} must be a number.`
    return n >= min ? '' : `${label} must be at least ${min}.`
  }

  const positiveNumber = (value: number | string, label = 'Value') => {
    const n = Number(value)
    if (isNaN(n)) return `${label} must be a number.`
    return n > 0 ? '' : `${label} must be greater than zero.`
  }

  const nonNegative = (value: number | string, label = 'Value') => {
    const n = Number(value)
    if (isNaN(n)) return `${label} must be a number.`
    return n >= 0 ? '' : `${label} must be 0 or greater.`
  }

  // Run an array of rule functions and return the first error string, or ''
  const validate = (value: unknown, rules: Array<(v: any) => string>): string => {
    for (const rule of rules) {
      const err = rule(value)
      if (err) return err
    }
    return ''
  }

  // Parse an Axios error into a user-facing message string.
  // Handles ASP.NET Core ModelState (errors.xxx[]), single message, and network errors.
  const parseApiError = (err: unknown): string => {
    const anyErr = err as any
    const data = anyErr?.response?.data

    if (!data) {
      if (anyErr?.message) return anyErr.message
      return 'An unexpected error occurred.'
    }

    // ASP.NET Core ModelState validation error shape: { errors: { Field: ["msg"] } }
    if (data.errors && typeof data.errors === 'object') {
      const messages = Object.values(data.errors as Record<string, string[]>)
        .flat()
        .filter(Boolean)
      if (messages.length > 0) return messages.join(' ')
    }

    if (data.message) return data.message
    if (typeof data === 'string') return data

    return 'An unexpected error occurred.'
  }

  return { required, email, minLength, minValue, positiveNumber, nonNegative, validate, parseApiError }
}
