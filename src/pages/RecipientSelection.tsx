import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { FieldVisibility, RecipientSelections, Candidate } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'


const RecipientSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getCandidate,
    updateRecipientSelections,
    recipientSelections,
    isLoadingCandidates,
  } = useAppContext();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [fieldVisibility, setFieldVisibility] = useState<FieldVisibility>({});
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldOrder, setFieldOrder] = useState<string[]>([]);

  const allFields = useMemo(() => {
    if (!candidate) return [];

    const defaultFields: (keyof Candidate)[] = [
      'name', 'phone', 'email', 'salary', 'expected_ctc',
      'notice', 'totalExperienceYears', 'location', 'cvUrl',
      'currentCompanyName', 'skills', 'education', 'jobTitle'
    ]

    const customFieldKeys = Object.keys(candidate.customFields || {});
    return [...defaultFields, ...customFieldKeys];
  }, [candidate]);

  useEffect(() => {
    console.log('RecipientSelection useEffect running...');
    if (!id || isLoadingCandidates) {
      console.log('useEffect: Skipping due to missing ID or isLoadingCandidates');
      setIsLoadingPage(isLoadingCandidates); // Keep page loading if AppContext is loading initially
      return
    }

    const candidateData = getCandidate(id);

    if (candidateData) {
      setCandidate(candidateData);

      const existingSelections = recipientSelections[id];

      if (existingSelections) {
        setFieldVisibility(existingSelections.fieldVisibility);
        setFieldOrder(allFields)
      } else {

        const defaultVisibility: FieldVisibility = {};

        if (allFields.length > 0) {
          allFields.forEach(field => {
            defaultVisibility[field] = {
              client: true,
              internal: true,
              superiors: true
            };
          });
          setFieldVisibility(defaultVisibility);
        }
        setFieldOrder(allFields);
      }
    } else {
      toast.error('Candidate not Found');
      navigate('/')
    }
  }, [id, isLoadingCandidates, getCandidate, recipientSelections, navigate, allFields]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedFields = Array.from(fieldOrder);
    const [movedField] = reorderedFields.splice(result.source.index, 1);
    reorderedFields.splice(result.destination.index, 0, movedField);

    setFieldOrder(reorderedFields);
  }, [fieldOrder]);

  const handleToggleVisibility = (field: string, recipientType: 'client' | 'internal' | 'superiors') => {
    setFieldVisibility(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] || { client: true, internal: true, superiors: true }),
        [recipientType]: !(prev[field]?.[recipientType] ?? true)
      }
    }));
  };

  const handleSelectAll = (recipientType: 'client' | 'internal' | 'superiors') => {
    setFieldVisibility(prev => {
      const updated = { ...prev };
      fieldOrder.forEach(field => {
        updated[field] = {
          ...updated[field],
          [recipientType]: true
        };
      });
      return updated;
    });
  };

  const handleDeselectAll = (recipientType: 'client' | 'internal' | 'superiors') => {
    setFieldVisibility(prev => {
      const updated = { ...prev };
      fieldOrder.forEach(field => {
        updated[field] = {
          ...updated[field],
          [recipientType]: false
        };
      });
      return updated;
    });
  };

  const handleSaveSelections = async () => {
    if (!id || !candidate) return;

    setIsSubmitting(true);

    try {
      const selections: RecipientSelections = {
        candidateId: id,
        fieldVisibility,
        fieldOrder: fieldOrder
      };

      const visibilityOnlySelections: RecipientSelections = {
        candidateId: id,
        fieldVisibility: fieldVisibility,
        fieldOrder: []
      }

      await updateRecipientSelections(id, visibilityOnlySelections);
      toast.success('Recipient selections saved');
      navigate(`/email-preview/${id}`, { state: { fieldOrder: fieldOrder } });
    } catch (error) {
      console.error('Error saving selections:', error);
      toast.error('Failed to save selections');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCandidates || !candidate || fieldOrder.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Recipient Field Selection</h1>
      <p className="text-gray-600 mb-6">
        Select which fields to include for each recipient type
      </p>

      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Candidate: {candidate.name}</h2>
          <p className="text-sm text-gray-600">
            Choose which information to share with each recipient type by using the checkboxes below.
          </p>
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId='field-list'>
            {(provided) => (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                        Field
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col items-center">
                          <span className="mb-2">Client</span>
                          <div className="flex space-x-2">
                            <button
                              type='button'
                              onClick={() => handleSelectAll('client')}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100"
                            >
                              All
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDeselectAll('client')}
                              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col items-center">
                          <span className="mb-2">Internal Team</span>
                          <div className="flex space-x-2">
                            <button
                              type='button'
                              onClick={() => handleSelectAll('internal')}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100"
                            >
                              All
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDeselectAll('internal')}
                              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex flex-col items-center">
                          <span className="mb-2">Superiors</span>
                          <div className="flex space-x-2">
                            <button
                              type='button'
                              onClick={() => handleSelectAll('superiors')}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md hover:bg-blue-100"
                            >
                              All
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDeselectAll('superiors')}
                              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-100"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" 
                  ref={provided.innerRef}{...provided.droppableProps}>
                    {fieldOrder.map((fieldKey, index) => {
                      // Find the candidate data for this fieldKey
                      const visibility = fieldVisibility[fieldKey] || {
                        client: true,
                        internal: true,
                        superiors: true
                      };

                      // Format field name for display
                      const displayField = fieldKey
                        .replace(/_/g, ' ')
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())

                      return (
                        <Draggable key={fieldKey} draggableId={fieldKey} index={index}>
                          {(provided) => (
                            <tr ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {displayField}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  type='button'
                                  onClick={() => handleToggleVisibility(fieldKey, 'client')}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${visibility.client
                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                >
                                  {visibility.client ? <Check size={16} /> : <X size={16} />}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  type='button'
                                  onClick={() => handleToggleVisibility(fieldKey, 'internal')}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${visibility.internal
                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                >
                                  {visibility.internal ? <Check size={16} /> : <X size={16} />}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  type='button'
                                  onClick={() => handleToggleVisibility(fieldKey, 'superiors')}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors ${visibility.superiors
                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                    }`}
                                >
                                  {visibility.superiors ? <Check size={16} /> : <X size={16} />}
                                </button>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </tbody>
                </table>
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/add-candidate`)}
            icon={<ArrowLeft size={18} />}
          >
            Back to Form
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSaveSelections}
            isLoading={isSubmitting}
            icon={<ArrowRight size={18} />}
          >
            Continue to Email Preview
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RecipientSelection;