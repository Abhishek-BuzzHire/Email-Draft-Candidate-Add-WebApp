import axios from 'axios';
import { Candidate, RecipientSelections } from '../types';

const API_URL = `http://192.168.1.201:5001/api`
console.log("Backend API:", `${API_URL}/candidates`);

export const getTodayCandidatesCount = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_URL}/candidates/count/today`, {
      method: 'GET',
      // No body needed for a GET request
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Get today candidates count API error:', errorData);
      throw new Error(`Failed to fetch today's candidate count: ${response.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
    // Assuming the backend returns { count: number }
    if (typeof data.count !== 'number') {
        throw new Error('API response missing or invalid count.');
    }

    return data.count; // Return the count (as a number)

  } catch (error) {
    console.error('Error in getTodayCandidatesCount apiService:', error);
    // Re-throw the error so the calling component can handle it
    if (error instanceof Error) {
       throw error;
    }
    throw new Error('An unexpected error occurred fetching today\'s candidate count.');
  }
};


export const apiService = {
    async getCandidates(): Promise<Candidate[]> {
        try {
            const response = await axios.get(`${API_URL}/candidates`);
            return response.data;
        } catch (error) {
            console.error('Error Fetching Candidates', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                throw new Error(error.response.data.error || `API error: ${error.response.status}`);
            }
            throw error;
        }
    },

    async getCandidate(candidateId: string): Promise<Candidate> {
        try {
            const response = await axios.get(`${API_URL}/candidates/${candidateId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching candidate ${candidateId}:`, error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                // Handle 404 specifically if needed, or let the calling component handle it
                if (error.response.status === 404) {
                    throw new Error('Candidate not found');
                }
                throw new Error(error.response.data.error || `API error: ${error.response.status}`);
            }
            throw error;
        }
    },

    async addCandidate(candidate: Omit<Candidate, 'id' | 'createdAt'>): Promise<Candidate> {
        try {
            // axios automatically serializes the candidate object to JSON and sets Content-Type header
            const response = await axios.post(`${API_URL}/candidates`, candidate);
            return response.data; // axios puts the response body in .data
        } catch (error) {
            console.error('Error adding Candidate:', error);
            // axios errors have a response property with status and data
            if (axios.isAxiosError(error) && error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                throw new Error(error.response.data.error || `API error: ${error.response.status}`);
            }
            throw error; // Rethrow other errors
        }
    },

    async updateCandidate(candidate: Candidate): Promise<Candidate> {
        try {
            const response = await axios.put(`${API_URL}/candidates/${candidate.id}`, candidate);
            return response.data;
        } catch (error) {
            console.error(`Error updating selections for candidate ${candidate.id}:`, error);
            throw error;
        }
    },

    async deleteCandidate(candidateId: string): Promise<void> {
        try {
            await axios.delete(`${API_URL}/candidates/${candidateId}`);
        } catch (error) {
            console.error(`Error deleting candidate ${candidateId}:`, error);
            throw error;
        }
    },

    async getRecipientSelections(candidateId: string): Promise<RecipientSelections | undefined> {
        try {
            const response = await axios.get(`${API_URL}/selections/${candidateId}`);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return undefined;
            }
            console.error(`Error fetching selections for Candidate ${candidateId}:`, error);
            throw error;
        }
    },

    async updateRecipientSelections(selections: RecipientSelections): Promise<RecipientSelections> {
        try {
            const response = await axios.put(`${API_URL}/selections/${selections.candidateId}`, selections);
            return response.data;
        } catch (error) {
            console.error(`Error updating selections for candidate ${selections.candidateId}:`, error);
            throw error;
        }
    },
};