import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Send, Copy, ArrowLeft, Check, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { Candidate, RecipientSelections, RecipientType } from '../types';
import { generateEmailContent, generateSubjectLine, sendEmail } from '../utils/emailService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';

import { useForm, Controller } from 'react-hook-form';

interface EmailFormFields {

  clientEmailAddress: string;
  internalEmailAddress: string;
  superiorsEmailAddress: string;
  clientSubject: string;
  internalSubject: string;
  superiorsSubject: string;
  ccAddress: string;
  bccAddress: string;
}


const EmailPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const fieldOrderFromState = (location.state as { fieldOrder?: string[] })?.fieldOrder;

  const {
    getCandidate,
    recipientSelections,
    isLoadingCandidates,
    isGoogleAuthenticated,
    googleAccessToken,
    connectGmail,
    setIsGoogleAuthenticated,
    setGoogleAccessToken
  } = useAppContext();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [selections, setSelections] = useState<RecipientSelections | null>(null);
  const [activeTab, setActiveTab] = useState<RecipientType>('client');

  const [staticEmailContent, setStaticEmailContent] = useState<Record<RecipientType, string>>({
    client: '',
    internal: '',
    superiors: ''
  });

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);


  // --- React Hook Form Setup ---
  const { control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<EmailFormFields>({
    defaultValues: {
      clientEmailAddress: '',
      internalEmailAddress: '',
      superiorsEmailAddress: '',
      clientSubject: '',
      internalSubject: '',
      superiorsSubject: '',
      ccAddress: '',
      bccAddress: '',
    }
  });

  const getEmailAddressFieldName = useCallback((tab: RecipientType): keyof EmailFormFields => {
    switch (tab) {
      case 'client': return 'clientEmailAddress';
      case 'internal': return 'internalEmailAddress';
      case 'superiors': return 'superiorsEmailAddress';
      default: return 'clientEmailAddress'; // Fallback
    }
  }, []);

  const getSubjectFieldName = useCallback((tab: RecipientType): keyof EmailFormFields => {
    switch (tab) {
      case 'client': return 'clientSubject';
      case 'internal': return 'internalSubject';
      case 'superiors': return 'superiorsSubject';
      default: return 'clientSubject'; // Fallback
    }
  }, []);


  // --- Data Fetching and Initialization Effect ---
  useEffect(() => {
    const fetchData = async () => {
      setIsInitializing(true);

      if (!id || isLoadingCandidates) {
        setIsInitializing(isLoadingCandidates);
        return;
      }

      const candidateData = getCandidate(id);
      const selectionsData = recipientSelections[id];

      if (candidateData && selectionsData) {
        setCandidate(candidateData);
        setSelections(selectionsData);

        const types: RecipientType[] = ['client', 'internal', 'superiors'];
        const newSubjects: Record<RecipientType, string> = { client: '', internal: '', superiors: '' };
        const newContent: Record<RecipientType, string> = { client: '', internal: '', superiors: '' };
        const newEmailAddresses: Record<RecipientType, string> = { client: '', internal: '', superiors: '' };


        types.forEach(type => {
          newSubjects[type] = generateSubjectLine(candidateData, type, selectionsData.fieldVisibility);
          newContent[type] = generateEmailContent(candidateData, type, selectionsData.fieldVisibility, fieldOrderFromState);
          if (type === 'client') {
            newEmailAddresses.client = candidateData.email || '';
          }
        });

        setValue('clientSubject', newSubjects.client);
        setValue('internalSubject', newSubjects.internal);
        setValue('superiorsSubject', newSubjects.superiors);

        setValue('clientEmailAddress', newEmailAddresses.client);
        setValue('internalEmailAddress', newEmailAddresses.internal);
        setValue('superiorsEmailAddress', newEmailAddresses.superiors);

        setStaticEmailContent(newContent);

      } else if (!candidateData && !isLoadingCandidates) {
        toast.error('Candidate or Selection data not found');
        navigate('/');
      }
      setIsInitializing(false);
    };

    fetchData();

  }, [id, isLoadingCandidates, getCandidate, recipientSelections, navigate, setValue, fieldOrderFromState]); // Add dependencies


  const onSubmit = async (data: EmailFormFields) => {
    
    const recipientEmail = data[getEmailAddressFieldName(activeTab)];
    const subjectLine = data[getSubjectFieldName(activeTab)];
    const emailBody = staticEmailContent[activeTab];
    const cc = data.ccAddress;
    const bcc = data.bccAddress;

    if (!recipientEmail) { // Validate recipient email (already handled by RHF rules but good fallback)
      toast.error('Please enter a recipient email address');
      return;
    }

    // Validate all email addresses using the helper
    const toError = validateEmailList(recipientEmail);
    const ccError = validateEmailList(cc);
    const bccError = validateEmailList(bcc);

    if (toError || ccError || bccError) {
      toast.error(toError || ccError || bccError);
      return;
    }


    if (!isGoogleAuthenticated || !googleAccessToken) {
      toast.error('Please connect to Gmail before sending.');
      return;
    }


    setError(null); // Clear previous errors

    try {
      // Pass the content from the form state (which is updated by the Tiptap editor)
      const success = await sendEmail(
        googleAccessToken,
        recipientEmail,
        subjectLine,
        emailBody,
        cc,
        bcc
      );

      if (success) {
        toast.success('Email sent successfully');
      } else {
        throw new Error('Failed to send email');
      }

    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while sending the email';
      setError(errorMessage);
      toast.error(errorMessage);

      // If authentication error, update context state
      if (errorMessage.includes('Access token is missing') || errorMessage.includes('Authentication failed') || errorMessage.includes('Access denied')) {
        setIsGoogleAuthenticated(false);
        setGoogleAccessToken(null);
      }

    } finally {
    }
  };

  // Use useCallback for copyToClipboard if it uses values from the editor instance
  const copyToClipboard = useCallback(() => {
    // Get the HTML content you want to copy
    // Since you've removed Tiptap, you'll use the static HTML content
    const emailHtml = staticEmailContent[activeTab]; // Use the static content


    if (!emailHtml) {
        toast.error('No email content to copy.');
        return;
    }

    // **MODIFIED:** Use the Clipboard API to write HTML content
    if (navigator.clipboard && navigator.clipboard.write) {
        // Create a new ClipboardItem with text/html MIME type
        const type = "text/html";
        const blob = new Blob([emailHtml], { type });
        const data = new ClipboardItem({ [type]: blob });

        navigator.clipboard.write([data])
            .then(() => {
                setCopySuccess(true);
                toast.success('Email content copied to clipboard (HTML).');
                setTimeout(() => setCopySuccess(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy HTML: ', err);
                toast.error('Failed to copy email content as HTML.');
            });
    } else {
       // **Fallback for older browsers (will likely paste as plain text)**
       // Create a temporary element, set its innerHTML, select it, and copy
       const tempElement = document.createElement('div');
       tempElement.innerHTML = emailHtml;
       tempElement.style.position = 'absolute'; // Hide the temporary element
       tempElement.style.left = '-9999px';
       document.body.appendChild(tempElement);

       const range = document.createRange();
       range.selectNodeContents(tempElement);

       const selection = window.getSelection();
       if (selection) {
           selection.removeAllRanges();
           selection.addRange(range);
       }

       try {
           document.execCommand('copy');
           setCopySuccess(true);
           toast.success('Email content copied to clipboard (fallback).');
           setTimeout(() => setCopySuccess(false), 2000);
       } catch (err) {
           console.error('Fallback copy failed: ', err);
           toast.error('Failed to copy email content (fallback).');
       } finally {
           if (selection) {
             selection.removeAllRanges();
           }
           document.body.removeChild(tempElement);
       }
    }
  }, [activeTab, staticEmailContent]);

  const validateEmailList = (emails: string): string | null => {
    if (!emails.trim()) return null;

    const emailList = emails.split(',').map(email => email.trim()).filter(email => email !== '');

    // **MODIFIED:** Use a more standard and permissive email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;


    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return `Invalid email format: ${invalidEmails.join(', ')}`;
    }

    return null; // Return null if all emails are valid
  };


  const handleConnectGmailClick = async () => {
    setIsConnectingGmail(true);
    try {
      await connectGmail();
      toast.success('Successfully connected to Gmail.');
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error('Failed to connect to Gmail:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Gmail.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnectingGmail(false);
    }
  };

  // Loading state check
  if (isLoadingCandidates || !candidate || !selections || isInitializing) { // Add check for editor instance
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-pulse text-gray-500">Loading email...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Preview & Send</h1>
      <p className="text-gray-600 mb-6">
        Preview and send customized emails to different recipients
      </p>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="text-red-700">
            <h3 className="font-semibold">Error</h3>
            <p>{error}</p>
          </div>
        </Card>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {(['client', 'internal', 'superiors'] as RecipientType[]).map(type => (
              <button
                type='button'
                key={type}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === type
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          
          <form onSubmit={handleSubmit(onSubmit)}>

            <div className="grid grid-cols-1 gap-4 mb-6">

              <Controller
                name={getSubjectFieldName(activeTab)}
                control={control}
                rules={{ required: 'Subject is required' }}
                render={({ field }) => (
                  <FormField
                    label="Subject"
                    name={field.name}
                    required
                    error={errors[getSubjectFieldName(activeTab)]?.message}
                  >
                    <input
                      {...field}
                      type="text"
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${errors[getSubjectFieldName(activeTab)] ? 'border-red-300' : ''}`}
                      disabled={!isGoogleAuthenticated || isSubmitting}
                    />
                  </FormField>
                )}
              />
            </div>


            {/* --- Tiptap Editor (Email Content) --- */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Preview
              </label>
              <div className="border border-gray-300 overflow-auto p-4 rounded-md bg-white" style={{ height: '500px' }}
              dangerouslySetInnerHTML={{ __html: staticEmailContent[activeTab] }}
              >
              </div>

            </div>


            {/* --- Form Actions --- */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/recipient-selection/${id}`)}
                icon={<ArrowLeft size={18} />}
                disabled={isSubmitting}
              >
                Back to Selection
              </Button>

              <div className="flex space-x-3">
                {/* Copy Button - uses content from the editor */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyToClipboard}
                  icon={copySuccess ? <Check size={18} /> : <Copy size={18} />}
                  disabled={isSubmitting}
                >
                  {copySuccess ? 'Copied!' : 'Copy Email'}
                </Button>

                {/* Send Email Button (submit button for the form) */}
                {isGoogleAuthenticated ? (
                  <Button
                    type="submit" // Set type="submit"
                    variant="primary"
                    isLoading={isSubmitting} // Use isSubmitting from React Hook Form
                    disabled={isSubmitting}
                    icon={<Send size={18} />}
                  >
                    Send Email
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConnectGmailClick}
                    isLoading={isConnectingGmail}
                    icon={<Mail size={18} />}
                    disabled={isSubmitting}
                  >
                    Connect to Gmail
                  </Button>
                )}
              </div>
            </div>
          </form> {/* Close the form */}
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
