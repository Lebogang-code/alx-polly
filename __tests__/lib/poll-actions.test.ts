import {
  fetchPolls,
  fetchPollById,
  createPoll,
  updatePoll,
  deletePoll,
  castVote
} from '@/app/lib/poll-actions';

// Mock the global fetch function
const mockFetch = global.fetch as jest.Mock;

// Reset mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
  // Mock localStorage.getItem to return a token
  jest.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
    if (key === 'auth_token') return 'mock-token';
    return null;
  });
});

describe('Poll Actions', () => {
  describe('fetchPolls', () => {
    it('should fetch all polls successfully', async () => {
      const mockPolls = [{ id: '1', title: 'Test Poll' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPolls
      } as Response);

      const result = await fetchPolls();

      expect(mockFetch).toHaveBeenCalledWith('/api/polls', {
        headers: { 'Authorization': 'Bearer mock-token' }
      });
      expect(result).toEqual(mockPolls);
    });

    it('should throw an error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      } as Response);

      await expect(fetchPolls()).rejects.toThrow('Failed to fetch polls');
    });
  });

  describe('fetchPollById', () => {
    it('should fetch a poll by ID successfully', async () => {
      const mockPoll = { id: '1', title: 'Test Poll' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPoll
      } as Response);

      const result = await fetchPollById('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/polls/1', {
        headers: { 'Authorization': 'Bearer mock-token' }
      });
      expect(result).toEqual(mockPoll);
    });

    it('should throw an error when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      } as Response);

      await expect(fetchPollById('1')).rejects.toThrow('Failed to fetch poll');
    });
  });

  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      const mockPollData = {
        title: 'New Poll',
        options: ['Option 1', 'Option 2']
      };
      const mockCreatedPoll = {
        id: '1',
        title: 'New Poll',
        options: [
          { id: '1', text: 'Option 1' },
          { id: '2', text: 'Option 2' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedPoll
      } as Response);

      const result = await createPoll(mockPollData);

      expect(mockFetch).toHaveBeenCalledWith('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify(mockPollData)
      });
      expect(result).toEqual(mockCreatedPoll);
    });

    it('should throw an error when no token is available', async () => {
      jest.spyOn(window.localStorage, 'getItem').mockReturnValueOnce(null);

      await expect(createPoll({ title: 'Test', options: [] }))
        .rejects.toThrow('Authentication required');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw an error when creation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Creation failed' })
      } as Response);

      await expect(createPoll({ title: 'Test', options: [] }))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('updatePoll', () => {
    it('should update a poll successfully', async () => {
      const mockPollData = {
        title: 'Updated Poll',
        options: [{ id: '1', text: 'Updated Option' }]
      };
      const mockUpdatedPoll = {
        id: '1',
        title: 'Updated Poll',
        options: [{ id: '1', text: 'Updated Option' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedPoll
      } as Response);

      const result = await updatePoll('1', mockPollData);

      expect(mockFetch).toHaveBeenCalledWith('/api/polls/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify(mockPollData)
      });
      expect(result).toEqual(mockUpdatedPoll);
    });

    it('should throw an error when no token is available', async () => {
      jest.spyOn(window.localStorage, 'getItem').mockReturnValueOnce(null);

      await expect(updatePoll('1', { title: 'Test' }))
        .rejects.toThrow('Authentication required');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw an error when update fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' })
      } as Response);

      await expect(updatePoll('1', { title: 'Test' }))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deletePoll', () => {
    it('should delete a poll successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      const result = await deletePoll('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/polls/1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw an error when no token is available', async () => {
      jest.spyOn(window.localStorage, 'getItem').mockReturnValueOnce(null);

      await expect(deletePoll('1'))
        .rejects.toThrow('Authentication required');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw an error when deletion fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Deletion failed' })
      } as Response);

      await expect(deletePoll('1'))
        .rejects.toThrow('Deletion failed');
    });
  });

  describe('castVote', () => {
    it('should cast a vote successfully', async () => {
      const mockResponse = {
        success: true,
        options: [
          { id: '1', text: 'Option 1', votes: 1, percentage: 100 }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await castVote('1', '1');

      expect(mockFetch).toHaveBeenCalledWith('/api/polls/1/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({ optionId: '1' })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error when no token is available', async () => {
      jest.spyOn(window.localStorage, 'getItem').mockReturnValueOnce(null);

      await expect(castVote('1', '1'))
        .rejects.toThrow('Authentication required');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw an error when voting fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Voting failed' })
      } as Response);

      await expect(castVote('1', '1'))
        .rejects.toThrow('Voting failed');
    });
  });
});