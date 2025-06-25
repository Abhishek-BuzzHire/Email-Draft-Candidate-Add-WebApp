import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';
import { Candidate, RecipientSelections, FieldVisibility } from '../types';
import { initializeGapi, requestAccessToken } from '../utils/emailService';

interface AppContextType {
  candidates: Candidate[];
  addCandidate: (candidate: Candidate) => Promise<string | undefined>;
  getCandidate: (id: string) => Candidate | undefined;
  updateCandidate: (id: string, candidate: Candidate) => Promise<void>;
  recipientSelections: Record<string, RecipientSelections>;
  updateRecipientSelections: (candidateId: string, selections: RecipientSelections) => Promise<void>;
  getSelections: (candidateId: string) => RecipientSelections | undefined;
  isGoogleAuthenticated: boolean;
  googleAccessToken: string | null;
  connectGmail: () => Promise<void>;
  setIsGoogleAuthenticated: (isAuthenticated: boolean) => void; // Expose setter for direct updates
  setGoogleAccessToken: (token: string | null) => void; // Expose setter for direct updates
  isLoadingCandidates: boolean;
}

const loadAuthStateFromLocalStorage = () => {
  const storedAccessToken = localStorage.getItem('googleAccessToken');
  const storedIsAuthenticated = localStorage.getItem('isGoogleAuthenticated');

  console.log('Checking Local Storage for auth state:');
  console.log('storedAccessToken:', storedAccessToken);
  console.log('storedIsAuthenticated:', storedIsAuthenticated);

  if (storedAccessToken && storedIsAuthenticated === 'true') {
    console.log('Loading auth state from Local Storage for initial state.');
    return {
      accessToken: storedAccessToken,
      isAuthenticated: true,
    };
  }
  console.log('No initial auth state found in Local Storage.');
  return {
    accessToken: null,
    isAuthenticated: false,
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [recipientSelections, setRecipientSelections] = useState<Record<string, RecipientSelections>>({});
  const initialAuthState = loadAuthStateFromLocalStorage();
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingCandidates(true);
      try {
        const fetchedCandidates = await apiService.getCandidates();
        setCandidates(fetchedCandidates);

        const selectionsMap: Record<string, RecipientSelections> = {};
        for (const candidate of fetchedCandidates) {
          try {
            const selections = await apiService.getRecipientSelections(candidate.id);
            if (selections) {
              selectionsMap[candidate.id] = selections;
            } else {
              const defaultFieldVisibility: FieldVisibility = {};
              Object.keys(candidate).forEach(field => {
                if (field !== 'id' && field !== 'createdAt') {
                  defaultFieldVisibility[field] = {
                    client: true,
                    internal: true,
                    superiors: true
                  };
                }
              });
              const defaultSelections: RecipientSelections = {
                candidateId: candidate.id,
                fieldVisibility: defaultFieldVisibility,
                fieldOrder: []
              };
              selectionsMap[candidate.id] = defaultSelections;
            }
          } catch (selectionError) {
            console.error(`Error fetching selections for candidate ${candidate.id}`, selectionError);
          }
        }
        setRecipientSelections(selectionsMap);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoadingCandidates(false);
      }
    };

    fetchInitialData()

    // Initialize Google API client
    initializeGapi().then(() => {
      console.log('Google API client initialized.');

      if (googleAccessToken && isGoogleAuthenticated && gapi.client) {
        gapi.client.setToken({ access_token: googleAccessToken });
        console.log('Set gapi.client token from loaded state.');
      }


      fetchInitialData();

    }).catch(error => {
      console.error('Failed to initialize Google API client:', error);
    });

  }, [googleAccessToken, isGoogleAuthenticated])


  const addCandidate = async (candidate: Omit<Candidate, 'id' | 'createdAt'>): Promise<string | undefined> => {
    try {
      const newCandidate = await apiService.addCandidate(candidate);
      setCandidates(prev => [...prev, newCandidate]);

      const defaultFieldVisibility: FieldVisibility = {};

      Object.keys(newCandidate).forEach(field => {
        if (field !== 'id' && field !== 'createdAt') {
          defaultFieldVisibility[field as keyof FieldVisibility] = {
            client: true,
            internal: true,
            superiors: true
          };
        }
      });
      const defaultSelections: RecipientSelections = {
        candidateId: newCandidate.id,
        fieldVisibility: defaultFieldVisibility,
        fieldOrder: [],
      };

      setRecipientSelections(prev => ({
        ...prev,
        [newCandidate.id]: defaultSelections
      }));

      try {
        await apiService.updateRecipientSelections(defaultSelections);
      } catch (selectionsError) {
        console.error('Error saving default recipient selections:', selectionsError);
      }

      return newCandidate.id;
    } catch (error) {
      console.error('Error adding candidate:', error);
      return undefined;
    }
  };

  const getCandidate = (id: string) => {
    return candidates.find(c => c.id === id);
  };

  const updateCandidate = async (id: string, candidate: Candidate): Promise<void> => {
    try {
      const updateCandidate = await apiService.updateCandidate(candidate);

      setCandidates(prev => prev.map(c => c.id === updateCandidate.id ? updateCandidate : c));

    } catch (error) {
      console.error(`Error updating candidate ${id}:`, error);
    }
  };

  const updateRecipientSelections = async (candidateId: string, selections: RecipientSelections): Promise<void> => {
    try {
      const updatedSelections = await apiService.updateRecipientSelections(selections);
      setRecipientSelections(prev => ({
        ...prev,
        [candidateId]: updatedSelections
      }));
    } catch (error) {
      console.error(`Error updating selections for candidates ${candidateId}:`, error);
    }
  };

  const getSelections = (candidateId: string) => {
    return recipientSelections[candidateId];
  };

  const connectGmail = async () => {
    try {
      const token = await requestAccessToken();
      if (token) {
        setGoogleAccessToken(token);
        setIsGoogleAuthenticated(true);
        console.log('Successfully authenticated with Google.');
        localStorage.setItem('googleAccessToken', token);
        localStorage.setItem('isGoogleAuthenticated', 'true');
        console.log('Saved auth state after successful connect.');
      }
    } catch (error) {
      console.error('Gmail authentication failed:', error);
      setGoogleAccessToken(null);
      setIsGoogleAuthenticated(false);
      localStorage.removeItem('googleAccessToken');
      localStorage.removeItem('isGoogleAuthenticated');
      console.log('Removed auth state after failed connect.');
      throw error; // Re-throw for component to handle
    }
  };


  return (
    <AppContext.Provider
      value={{
        candidates,
        addCandidate,
        getCandidate,
        updateCandidate,
        recipientSelections,
        updateRecipientSelections,
        getSelections,
        isGoogleAuthenticated,
        googleAccessToken,
        connectGmail,
        setIsGoogleAuthenticated, // Expose setter
        setGoogleAccessToken, // Expose setter
        isLoadingCandidates,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
