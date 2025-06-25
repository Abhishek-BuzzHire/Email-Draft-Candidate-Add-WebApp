import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { Candidate } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';

type FormData = Omit<Candidate, 'id' | 'createdAt'>;

const CandidateForm: React.FC = () => {
  const navigate = useNavigate();
  const { addCandidate } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    salary: null,
    expected_ctc: null,
    notice: null,
    totalExperienceYears: null,
    location: '',
    cvUrl: '',
    currentCompanyName: '', 
    skills: [],
    education: '',
    jobTitle:'',
    source:'',
    customFields: {} as Record<string, string>,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [skillInput, setSkillInput] = useState('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['salary', 'expected_ctc', 'notice', 'totalExperienceYears']
    const updatedValue = numericFields.includes(name) && value !== '' ? parseFloat(value) : value;

    setFormData(prev => ({ ...prev, [name]: updatedValue }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const { name, value } = e.target;

  // Update form data
  setFormData(prev => ({ ...prev, [name]: value }));

  // Clear error when field is edited
  if (errors[name]) {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }
};

  
  const handleSkillInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkillInput(e.target.value);
  };
  
  const handleAddSkill = () => {
    const input = skillInput.trim();

    if(input === ''){
      return;
    }

    if (input.includes(',')) {
      const skillsToAdd = input.split(',').map(skill => skill.trim()).filter(skill => skill !== '');
      if (skillsToAdd.length > 0) {
        setFormData(prev => {
          const updatedSkills = [...prev.skills];
          skillsToAdd.forEach(skill => {
            if(!updatedSkills.includes(skill)){
              updatedSkills.push(skill);
            }
          });
          return {
            ...prev, skills: updatedSkills
          };
        });
      }
    } else {
      if (!formData.skills.includes(input)) {
        setFormData(prev => ({
          ...prev, skills: [...prev.skills, input]
        }));
      }
    }
    setSkillInput('');
  };
  
  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };
  
  const handleAddCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }]);
  };
  
  const handleCustomFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedFields = [...customFields];
    updatedFields[index][field] = value;
    setCustomFields(updatedFields);
    
    // Update the formData customFields object
    const customFieldsObject: Record<string, string> = {};
    updatedFields.forEach(field => {
      if (field.key.trim() !== '') {
        customFieldsObject[field.key] = field.value;
      }
    });
    
    setFormData(prev => ({
      ...prev,
      customFields: customFieldsObject
    }));
  };
  
  const handleRemoveCustomField = (index: number) => {
    const updatedFields = customFields.filter((_, i) => i !== index);
    setCustomFields(updatedFields);
    
    // Update the formData customFields object
    const customFieldsObject: Record<string, string> = {};
    updatedFields.forEach(field => {
      if (field.key.trim() !== '') {
        customFieldsObject[field.key] = field.value;
      }
    });
    
    setFormData(prev => ({
      ...prev,
      customFields: customFieldsObject
    }));
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const candidatePayload = {
        id: '',
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        salary: formData.salary,
        expected_ctc: formData.expected_ctc,
        notice: formData.notice,
        totalExperienceYears: formData.totalExperienceYears,
        location: formData.location,
        cvUrl: formData.cvUrl,
        currentCompanyName: formData.currentCompanyName,
        skills: formData.skills,
        education: formData.education,
        jobTitle: formData.jobTitle,
        source: formData.source,
        customFields: formData.customFields,
      };

      const candidateId = await addCandidate(candidatePayload);

      if (candidateId) {
        toast.success('Candidate added successfully.');
        navigate(`/recipient-selection/${candidateId}`,
        );
        
      } else {
        toast.error('Failed to add candidate. Please try again.')
      }
    } catch (error) {
      console.error('Error addidng candidate:', error);
      toast.error('Failed to add candidate');
    } finally{
      setIsSubmitting(false)
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Candidate</h1>
      
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <FormField
              label="Full Name"
              name="name"
              required
              error={errors.name}
            >
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                  ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="John Doe"
              />
            </FormField>
            
            <FormField
              label="Email"
              name="email"
              required
              error={errors.email}
            >
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`mt-1 p-2 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                  ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                placeholder="john.doe@example.com"
              />
            </FormField>
            
            <FormField
              label="Phone"
              name="phone"
              error={errors.phone}
            >
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="+1 (123) 456-7890"
              />
            </FormField>
            
            <FormField
              label="Current Company"
              name="currentCompanyName"
            >
              <input
                type="text"
                id="currentCompanyName"
                name="currentCompanyName"
                value={formData.currentCompanyName}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="ABC Corp"
              />
            </FormField>

            <FormField
                label="Job Title"
                name="jobTitle"
             >
                 <input
                     type="text"
                     id="jobTitle"
                     name="jobTitle"
                     value={formData.jobTitle}
                     onChange={handleInputChange}
                     className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                     placeholder="Software Engineer"
                 />
             </FormField>
            
            <FormField
              label="Total Experience (in Years)"
              name="totalExperienceYears"
            >
              <input
                type="number"
                id="totalExperienceYears"
                name="totalExperienceYears"
                value={formData.totalExperienceYears ?? ''}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="5 years"
              />
            </FormField>

            <FormField
              label="Current CTC (Annual)"
              name="salary"
            >
              <input
                type="number"
                id="salary"
                name="salary"
                value={formData.salary ?? ''}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="$100,000"
              />
            </FormField>
            
            <FormField
              label="Expected CTC (Annual)"
              name="expected_ctc"
            >
              <input
                type="number"
                id="expected_ctc"
                name="expected_ctc"
                value={formData.expected_ctc ?? ''}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="$100,000"
              />
            </FormField>
            
            <FormField
              label="Location"
              name="location"
            >
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="New York, NY"
              />
            </FormField>
            
            <FormField
              label="Resume Link"
              name="cvUrl"
              hint="URL to candidate's resume or portfolio"
            >
              <input
                type="url"
                id="cvUrl"
                name="cvUrl"
                value={formData.cvUrl}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://example.com/resume.pdf"
              />
            </FormField>
            <FormField
               label="Notice Period (Days)" // Example label
               name="notice"
             >
               <input
                 type="number"
                 id="notice"
                 name="notice"
                 value={formData.notice ?? ''}
                 onChange={handleInputChange}
                 className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                 placeholder="30"
               />
             </FormField>

             <FormField
                label="Education"
                name="education"
             >
                 <input
                     type="text"
                     id="education"
                     name="education"
                     value={formData.education}
                     onChange={handleInputChange}
                     className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                     placeholder="Bachelor's Degree"
                 />
             </FormField>

             <FormField label="Recruiter Source" name='source'>
              <select className='text-xl' name='source' id='source' value={formData.source} onChange={handleSelectChange}>
                  <option value="Recruiter">Select a Recruiter</option>
                  <option value="Shaymin">Shaymin</option>
                  <option value="Tanya">Tanya</option>
                  <option value="Kashish">Kashish</option>
                  <option value="Nishtha">Nishtha</option>
                  <option value="Somya">Somya</option>
                  <option value="Simran">Simran</option>
                  <option value="Nitin">Nitin</option>
                  <option value="Apoorva">Apoorva</option>
                  <option value="Pragya">Pragya</option>
                  <option value="Arshpreet">Arshpreet</option>
                  <option value="Jyoti">Jyoti</option>
              </select>
             </FormField>
          </div>

          {/* Skills section */}
          <div className="mt-6">
            <FormField
              label="Skills"
              name="skills"
              hint="Enter skills and press Enter or Add"
            >
              <div className="flex">
                <input
                  type="text"
                  id="skills"
                  value={skillInput}
                  onChange={handleSkillInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="JavaScript"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-2 mt-1"
                  onClick={handleAddSkill}
                  icon={<Plus size={16} />}
                >
                  Add
                </Button>
              </div>
            </FormField>
            
            {formData.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-m flex items-center"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1.5 text-blue-500 hover:text-blue-700 focus:outline-none"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Custom Fields */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Custom Fields</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomField}
                icon={<Plus size={16} />}
              >
                Add Custom Field
              </Button>
            </div>
            
            {customFields.map((field, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-3">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                    placeholder="Field Name"
                    className="block p-2 m-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                    placeholder="Field Value"
                    className="block p-2 m-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomField(index)}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Form Actions */}
          <div className="mt-8 flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              icon={<Save size={18} />}
            >
              Save & Continue
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CandidateForm;