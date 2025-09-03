import { CreatePollRequest, Poll, PollOption, EditPollFormData } from '@/app/types'
import { supabaseClient } from './supabase-client'
import { getAuthHeaders, requireAuth, getCurrentUserId } from './auth-utils'
import { validateCreatePollRequest, validatePollId, validateOptionId } from './validation'
import { 
  ApiResponse, 
  PollOperationError, 
  NetworkError, 
  AuthenticationError,
  createSuccessResponse,
  createErrorResponse 
} from './error-handler'

/**
 * Centralized poll operations service
 * Provides modular, type-safe poll management with standardized error handling
 */
export class PollService {
  private client = supabaseClient.getClient()

  /**
   * Fetches all polls from the database
   * @returns Promise with standardized API response containing polls array
   */
  async fetchPolls(): Promise<ApiResponse<Poll[]>> {
    try {
      const { data: polls, error } = await this.client
        .from('polls')
        .select(`
          *,
          options:poll_options(*),
          votes:votes(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        throw new PollOperationError(`Failed to fetch polls: ${error.message}`, 'FETCH_ERROR')
      }

      return createSuccessResponse(polls || [])
    } catch (error) {
      if (error instanceof PollOperationError) {
        return createErrorResponse(error.message, error.code)
      }
      return createErrorResponse('An unexpected error occurred while fetching polls', 'UNKNOWN_ERROR')
    }
  }

  /**
   * Fetches a specific poll by ID
   * @param id - The poll ID to fetch
   * @returns Promise with standardized API response containing poll data
   */
  async fetchPollById(id: string): Promise<ApiResponse<Poll>> {
    try {
      // Validate poll ID
      validatePollId(id)

      const { data: poll, error } = await this.client
        .from('polls')
        .select(`
          *,
          options:poll_options(*),
          votes:votes(count),
          created_by:profiles(id, name, email)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new PollOperationError('Poll not found', 'POLL_NOT_FOUND')
        }
        throw new PollOperationError(`Failed to fetch poll: ${error.message}`, 'FETCH_ERROR')
      }

      return createSuccessResponse(poll)
    } catch (error) {
      if (error instanceof PollOperationError) {
        return createErrorResponse(error.message, error.code)
      }
      return createErrorResponse('An unexpected error occurred while fetching the poll', 'UNKNOWN_ERROR')
    }
  }

/**
 * Creates a new poll
 * @param pollData - The poll data to create
 * @returns Promise with the created poll
 */
export async function createPoll(pollData: CreatePollRequest): Promise<Poll> {
  const token = localStorage.getItem("auth_token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await fetch("/api/polls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(pollData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create poll");
  }
  
  return await response.json();
}

/**
 * Updates an existing poll
 * @param id - The poll ID to update
 * @param pollData - The updated poll data
 * @returns Promise with the updated poll
 */
export async function updatePoll(id: string, pollData: any): Promise<Poll> {
  const token = localStorage.getItem("auth_token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await fetch(`/api/polls/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(pollData)
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update poll");
  }
  
  return await response.json();
}

/**
 * Deletes a poll
 * @param id - The poll ID to delete
 * @returns Promise with success status
 */
export async function deletePoll(id: string): Promise<{ success: boolean }> {
  const token = localStorage.getItem("auth_token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await fetch(`/api/polls/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to delete poll");
  }
  
  return await response.json();
}

/**
 * Casts a vote on a poll
 * @param pollId - The poll ID to vote on
 * @param optionId - The option ID to vote for
 * @returns Promise with updated options
 */
export async function castVote(pollId: string, optionId: string): Promise<{ success: boolean, options: PollOption[] }> {
  const token = localStorage.getItem("auth_token");
  
  if (!token) {
    throw new Error("Authentication required");
  }
  
  const response = await fetch(`/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ optionId })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to cast vote");
  }
  
  return await response.json();
}