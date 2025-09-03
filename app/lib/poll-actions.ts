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
   * @returns Promise with standardized API response containing created poll
   */
  async createPoll(pollData: CreatePollRequest): Promise<ApiResponse<Poll>> {
    try {
      // Require authentication
      const user = await requireAuth()
      
      // Validate input data
      validateCreatePollRequest(pollData)

      // Create poll record
      const { data: poll, error: pollError } = await this.client
        .from('polls')
        .insert({
          title: pollData.title.trim(),
          description: pollData.description?.trim(),
          created_by: user.id,
          expires_at: pollData.expiresAt,
          is_active: true
        })
        .select()
        .single()

      if (pollError) {
        throw new PollOperationError(`Failed to create poll: ${pollError.message}`, 'CREATE_ERROR')
      }

      // Create poll options
      const optionsData = pollData.options.map((optionText, index) => ({
        poll_id: poll.id,
        text: optionText.trim(),
        order_index: index
      }))

      const { error: optionsError } = await this.client
        .from('poll_options')
        .insert(optionsData)

      if (optionsError) {
        // Rollback poll creation if options fail
        await this.client.from('polls').delete().eq('id', poll.id)
        throw new PollOperationError(`Failed to create poll options: ${optionsError.message}`, 'CREATE_ERROR')
      }

      // Fetch complete poll with options
      const createdPoll = await this.fetchPollById(poll.id)
      if (!createdPoll.success) {
        throw new PollOperationError('Failed to retrieve created poll', 'CREATE_ERROR')
      }

      return createSuccessResponse(createdPoll.data)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return createErrorResponse(error.message, error.code)
      }
      if (error instanceof PollOperationError) {
        return createErrorResponse(error.message, error.code)
      }
      return createErrorResponse('An unexpected error occurred while creating the poll', 'UNKNOWN_ERROR')
    }
  }

  /**
   * Updates an existing poll
   * @param id - The poll ID to update
   * @param pollData - The updated poll data
   * @returns Promise with standardized API response containing updated poll
   */
  async updatePoll(id: string, pollData: EditPollFormData): Promise<ApiResponse<Poll>> {
    try {
      // Require authentication
      const user = await requireAuth()
      
      // Validate input data
      validatePollId(id)
      validateEditPollFormData(pollData)

      // Check if poll exists and user owns it
      const { data: existingPoll, error: fetchError } = await this.client
        .from('polls')
        .select('id, created_by')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (fetchError || !existingPoll) {
        throw new PollOperationError('Poll not found', 'POLL_NOT_FOUND')
      }

      if (existingPoll.created_by !== user.id) {
        throw new PollOperationError('You do not have permission to update this poll', 'PERMISSION_DENIED')
      }

      // Update poll
      const { error: updateError } = await this.client
        .from('polls')
        .update({
          title: pollData.title.trim(),
          description: pollData.description?.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        throw new PollOperationError(`Failed to update poll: ${updateError.message}`, 'UPDATE_ERROR')
      }

      // Update options if provided
      if (pollData.options && pollData.options.length > 0) {
        // Delete existing options
        await this.client.from('poll_options').delete().eq('poll_id', id)
        
        // Insert new options
        const optionsData = pollData.options.map((option, index) => ({
          poll_id: id,
          text: option.text.trim(),
          order_index: index
        }))

        const { error: optionsError } = await this.client
          .from('poll_options')
          .insert(optionsData)

        if (optionsError) {
          throw new PollOperationError(`Failed to update poll options: ${optionsError.message}`, 'UPDATE_ERROR')
        }
      }

      // Fetch updated poll
      const updatedPoll = await this.fetchPollById(id)
      if (!updatedPoll.success) {
        throw new PollOperationError('Failed to retrieve updated poll', 'UPDATE_ERROR')
      }

      return createSuccessResponse(updatedPoll.data)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return createErrorResponse(error.message, error.code)
      }
      if (error instanceof PollOperationError) {
        return createErrorResponse(error.message, error.code)
      }
      return createErrorResponse('An unexpected error occurred while updating the poll', 'UNKNOWN_ERROR')
    }
  }
  
  /**
   * Deletes a poll (soft delete by setting is_active to false)
   * @param id - The poll ID to delete
   * @returns Promise with standardized API response
   */
  async deletePoll(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Require authentication
      const user = await requireAuth()
      
      // Validate poll ID
      validatePollId(id)

      // Check if poll exists and user owns it
      const { data: existingPoll, error: fetchError } = await this.client
        .from('polls')
        .select('id, created_by')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (fetchError || !existingPoll) {
        throw new PollOperationError('Poll not found', 'POLL_NOT_FOUND')
      }

      if (existingPoll.created_by !== user.id) {
        throw new PollOperationError('You do not have permission to delete this poll', 'PERMISSION_DENIED')
      }

      // Soft delete the poll
      const { error: deleteError } = await this.client
        .from('polls')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (deleteError) {
        throw new PollOperationError(`Failed to delete poll: ${deleteError.message}`, 'DELETE_ERROR')
      }

      return createSuccessResponse({ success: true })
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return createErrorResponse(error.message, error.code)
      }
      if (error instanceof PollOperationError) {
        return createErrorResponse(error.message, error.code)
      }
      return createErrorResponse('An unexpected error occurred while deleting the poll', 'UNKNOWN_ERROR')
    }
  }

  /**
   * Casts a vote on a poll
   * @param pollId - The poll ID to vote on
   * @param optionId - The option ID to vote for
   * @returns Promise with standardized API response containing updated poll data
   */
  async castVote(pollId: string, optionId: string): Promise<ApiResponse<{ success: boolean, poll: Poll }>> {
    try {
      // Require authentication
      const user = await requireAuth()
      
      // Validate input
      validatePollId(pollId)
      validateOptionId(optionId)

      // Check if poll exists and is active
      const { data: poll, error: pollError } = await this.client
        .from('polls')
        .select('id, expires_at, is_active')
        .eq('id', pollId)
        .eq('is_active', true)
        .single()

      if (pollError || !poll) {
        throw new PollOperationError('Poll not found', 'POLL_NOT_FOUND')
      }

      // Check if poll has expired
      if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
        throw new PollOperationError('This poll has expired', 'POLL_EXPIRED')
      }

      // Check if option exists for this poll
      const { data: option, error: optionError } = await this.client
        .from('poll_options')
        .select('id')
        .eq('id', optionId)
        .eq('poll_id', pollId)
        .single()

      if (optionError || !option) {
        throw new PollOperationError('Invalid poll option', 'INVALID_OPTION')
      }

      // Check if user has already voted
      const { data: existingVote } = await this.client
        .from('votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .single()

      if (existingVote) {
        throw new PollOperationError('You have already voted on this poll', 'ALREADY_VOTED')
      }

      // Cast the vote
      const { error: voteError } = await this.client
        .from('votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id
        })

      if (voteError) {
        throw new PollOperationError(`Failed to cast vote: ${voteError.message}`, 'VOTE_ERROR')
      }

      // Fetch updated poll data
      const updatedPoll = await this.fetchPollById(pollId)
      if (!updatedPoll.success) {
        throw new PollOperationError('Failed to retrieve updated poll data', 'VOTE_ERROR')
      }

      return createSuccessResponse({ success: true, poll: updatedPoll.data })
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return createErrorResponse(error.message, error.code)
      }
      if (error instanceof PollOperationError) {
        return createErrorResponse(error.message, error.code)
      }
      return createErrorResponse('An unexpected error occurred while casting your vote', 'UNKNOWN_ERROR')
    }
  }
}

// Export singleton instance for backward compatibility and ease of use
export const pollService = new PollService()

// Export individual functions for backward compatibility
export const fetchPolls = () => pollService.fetchPolls()
export const fetchPollById = (id: string) => pollService.fetchPollById(id)
export const createPoll = (pollData: CreatePollRequest) => pollService.createPoll(pollData)
export const updatePoll = (id: string, pollData: EditPollFormData) => pollService.updatePoll(id, pollData)
export const deletePoll = (id: string) => pollService.deletePoll(id)
export const castVote = (pollId: string, optionId: string) => pollService.castVote(pollId, optionId)