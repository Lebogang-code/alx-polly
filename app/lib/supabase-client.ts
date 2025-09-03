import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase-types'

/**
 * Centralized Supabase client configuration
 * Provides a single source of truth for Supabase client creation
 */
class SupabaseClientManager {
  private static instance: SupabaseClientManager
  private client: ReturnType<typeof createClient<Database>>

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }

  public static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager()
    }
    return SupabaseClientManager.instance
  }

  public getClient() {
    return this.client
  }

  /**
   * Get the current authenticated user
   */
  public async getCurrentUser() {
    const { data: { user }, error } = await this.client.auth.getUser()
    
    if (error) {
      throw new Error(`Failed to get current user: ${error.message}`)
    }
    
    return user
  }

  /**
   * Get the current session
   */
  public async getCurrentSession() {
    const { data: { session }, error } = await this.client.auth.getSession()
    
    if (error) {
      throw new Error(`Failed to get current session: ${error.message}`)
    }
    
    return session
  }
}

// Export singleton instance
export const supabaseClient = SupabaseClientManager.getInstance()
export const supabase = supabaseClient.getClient()
