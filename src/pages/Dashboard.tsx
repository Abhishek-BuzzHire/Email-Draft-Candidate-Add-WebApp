import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, User, ChevronRight, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Candidate } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getTodayCandidatesCount } from '../utils/apiService';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { candidates, isLoadingCandidates } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [todayCandidatesCount, setTodayCandidatesCount] = useState<number | null>(null);
  const [isLoadingTodayCount, setIsLoadingTodayCount] = useState(true);
  const [todayCountError, setTodayCountError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodayCount = async () => {
      setIsLoadingTodayCount(true);
      setTodayCountError(null);
      try {
        const count = await getTodayCandidatesCount();
        setTodayCandidatesCount(count);
      } catch (error) {
        console.error('Failed to fetch today\'s candidate count:', error);
        setTodayCountError('Failed to load today\'s count.');
        setTodayCandidatesCount(null); // Reset count on error
      } finally {
        setIsLoadingTodayCount(false);
      }
    };

    fetchTodayCount();
  }, []);

  const totalCandidates = candidates.length;

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCandidates(candidates);
    } else {
      const lowerCaseSearch = searchTerm.toLowerCase();
      const filtered = candidates.filter(candidate =>
        candidate.name.toLowerCase().includes(lowerCaseSearch) ||
        candidate.email.toLowerCase().includes(lowerCaseSearch) ||
        candidate.currentCompanyName.toLowerCase().includes(lowerCaseSearch) ||
        candidate.location.toLowerCase().includes(lowerCaseSearch) ||
        candidate.skills.some(skill => skill.toLowerCase().includes(lowerCaseSearch))
      );
      setFilteredCandidates(filtered);
    }
  }, [searchTerm, candidates]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className=" flex gap-2 text-2xl font-bold text-gray-800">Total Candidates Added: {isLoadingCandidates ? (
              <div className="animate-pulse h-6 bg-gray-200 rounded w-1/4"></div>
            ) : (
              <span className="text-blue-600">{totalCandidates}</span>
            )}</h1>
            <h2 className="flex gap-2 text-lg font-semibold text-gray-700 mb-2">Candidates Added Today: {isLoadingTodayCount ? (
              <div className="animate-pulse h-6 bg-gray-200 rounded w-1/4"></div>
            ) : todayCountError ? (
              <p className="text-red-600 text-sm">{todayCountError}</p>
            ) : (
              <span className="text-blue-600">{todayCandidatesCount ?? 'N/A'}</span>
            )}on {formatDate(Date())}</h2>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => navigate('/add-candidate')}
          icon={<Plus size={18} />}
          className="mt-4 md:mt-0"
        >
          Add New Candidate
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
            placeholder="Search candidates by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoadingCandidates ? ( // Show spinner if loading
        <div className="flex justify-center py-12 text-center">
          <p className='text-lg'>Loading...</p> {/* Assuming you have a Spinner component */}
        </div>
      ) : filteredCandidates.length === 0 ? ( // Show "no candidates" message if not loading and no candidates
        <Card className="text-center py-12">
          <div className="flex flex-col items-center">
            <User size={48} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No candidates found
            </h3>
            {searchTerm ? (
              <p className="text-gray-500 mb-4">
                No candidates match your search. Try different keywords or clear the search.
              </p>
            ) : (
              <p className="text-gray-500 mb-4">
                Get started by adding your first candidate information.
              </p>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate('/add-candidate')}
              icon={<Plus size={18} />}
            >
              Add New Candidate
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredCandidates.map(candidate => (
            <Card key={candidate.id} className="hover:shadow-md transition-shadow duration-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-start">
                    <div className="bg-blue-100 text-blue-700 rounded-full p-3 mr-4">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{candidate.name}</h3>
                      <p className="text-gray-600">{candidate.email}</p>

                      <div className="mt-2 space-y-1">
                        {candidate.currentCompanyName && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Company:</span> {candidate.currentCompanyName}
                          </p>
                        )}
                        {candidate.location && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Location:</span> {candidate.location}
                          </p>
                        )}
                        {candidate.totalExperienceYears && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Experience:</span> {candidate.totalExperienceYears} Yrs
                          </p>
                        )}
                      </div>

                      {candidate.skills && candidate.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{candidate.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 md:ml-4 flex flex-col md:items-end">
                  {candidate.createdAt && (
                    <p className="text-xs text-gray-500 mb-3">
                      Added on {candidate.createdAt}
                    </p>
                  )}

                  <div className="flex space-x-2">
                    {/* <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Would navigate to edit form in a full implementation
                        toast.info('Edit functionality would be here in the full version');
                      }}
                      icon={<Edit size={16} />}
                    >
                      Edit
                    </Button> */}
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (candidate && candidate.id) {
                          navigate(`/recipient-selection/${candidate.id}`);
                        } else {
                          console.error('Candidate or Candidate ID is missing!');
                        }
                      }}
                      icon={<ChevronRight size={16} />}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;