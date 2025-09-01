import { CreatePollRequest, Poll, PollOption } from '@/app/types';

/**
 * Fetches all polls from the API
 * @returns Promise with array of polls
 */
export async function fetchPolls(): Promise<Poll[]> {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch("/api/polls", { headers });
  
  if (!response.ok) {
    throw new Error("Failed to fetch polls");
  }
  
  return await response.json();
}

/**
 * Fetches a specific poll by ID
 * @param id - The poll ID to fetch
 * @returns Promise with the poll data
 */
export async function fetchPollById(id: string): Promise<Poll> {
  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(`/api/polls/${id}`, { headers });
  
  if (!response.ok) {
    throw new Error("Failed to fetch poll");
  }
  
  return await response.json();
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