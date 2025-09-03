import { supabaseClient } from './supabase-client'
import { User } from '@supabase/supabase-js'

/**
 * Authentication utility functions
 * Abstracts user authentication logic for reuse across the application
 */

export interface AuthResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await supabaseClient.getCurrentUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    return user !== null
  } catch (error) {
    return false
  }
}

/**
 * Get authentication headers for API requests
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await supabaseClient.getCurrentSession()
    
    if (!session?.access_token) {
      throw new AuthError('No valid session found', 'NO_SESSION')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  } catch (error) {
    throw new AuthError(
      error instanceof Error ? error.message : 'Failed to get auth headers',
      'AUTH_HEADER_ERROR'
    )
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AuthError('Authentication required', 'AUTH_REQUIRED')
  }
  
  return user
}

/**
 * Get user ID from current session
 */
export async function getCurrentUserId(): Promise<string> {
  const user = await requireAuth()
  return user.id
}
