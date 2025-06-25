import { Key } from 'lucide-react';
import { EmailContent, Candidate, FieldVisibility, RecipientType } from '../types';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

let tokenClient: google.accounts.oauth2.TokenClient;
let tokenClientPromise: Promise<void> | null = null;

export const initializeGapi = (): Promise<void> => {
  if (tokenClientPromise) {
    return tokenClientPromise; // Return existing promise if initialization is in progress
  }

  tokenClientPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client', async () => {
        await gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });

        // Load the Google Identity Services library
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.onload = () => {
          tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: SCOPES.join(' '),
            callback: (response) => {
              // This callback is now handled in AppContext
              console.log('Token client callback triggered:', response);
              if (response.error) {
                console.error('Token client error:', response.error);
                // Handle error, perhaps clear token in AppContext
              } else {
                console.log('Token client success. Token:', response);
                // The access token needs to be handled by AppContext
                // This callback is primarily for the prompt result, not token storage here
              }
            },
          });
          resolve(); // Resolve the promise after tokenClient is initialized
        };
        gsiScript.onerror = reject;
        document.body.appendChild(gsiScript);
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return tokenClientPromise;
};


export const requestAccessToken = (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google API client not initialized. Call initializeGapi first.'));
      return;
    }

    tokenClient.callback = (response) => {
      if (response.error) {
        if (response.error === 'access_denied') {
          reject(new Error('Access denied. Please make sure you are added as a test user in the Google Cloud Console.'));
        } else {
          reject(new Error(`Authentication failed: ${response.error}`));
        }
      } else {
        resolve(response.access_token || null); // Resolve with the access token
      }
    };

    // prompt: 'consent' will always show the consent screen.
    // To avoid repeated prompts after the first time, you might remove this or use 'none'
    // and handle the case where 'none' fails (requires user interaction).
    tokenClient.requestAccessToken({
      prompt: 'consent'
    });
  });
};


const validateEmails = (emails: string): boolean => {
  if (!emails.trim()) return true;
  const emailList = emails.split(',').map(email => email.trim());
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailList.every(email => emailRegex.test(email));
};

const utf8ToBase64 = (str: string): string => {
  const uint8array = new TextEncoder().encode(str);
  const base64String = btoa(String.fromCharCode(...uint8array));
  return base64String
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const createMessage = (to: string, subject: string, content: string, cc?: string, bcc?: string) => {
  const headers = [
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    bcc ? `Bcc: ${bcc}` : '',
    `Subject: ${subject}`
  ].filter(Boolean).join('\r\n');

  const message = `${headers}\r\n\r\n${content}`;

  return utf8ToBase64(message)
};

export const sendEmail = async (
  accessToken: string, // Accept access token as parameter
  recipient: string,
  subject: string,
  content: string,
  cc?: string,
  bcc?: string
): Promise<boolean> => {
  try {
    if (!gapi.client?.gmail) {
      throw new Error('Gmail API not initialized');
    }

    if (!accessToken) {
      throw new Error('Access token is missing.');
    }

    // Set the access token for the API client
    gapi.client.setToken({ access_token: accessToken });

    // Validate all email addresses
    if (!validateEmails(recipient) ||
      (cc && !validateEmails(cc)) ||
      (bcc && !validateEmails(bcc))) {
      throw new Error('Invalid email address format');
    }

    const encodedMessage = createMessage(recipient, subject, content, cc, bcc);

    await gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: encodedMessage
      }
    });

    // Clear the token after use if you don't want it persistent on gapi.client
    // gapi.client.setToken(null); // Optional

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error instanceof Error && error.message.includes('test user')) {
      throw new Error('Please add your email as a test user in the Google Cloud Console');
    }
    if (error instanceof Error && error.message.includes('Access token is missing')) {
      throw new Error('Please connect to Gmail to send emails.');
    }
    if (error instanceof Error && error.message.includes('Invalid email address format')) {
      throw error;
    }
    return false;
  }
};

export const generateEmailContent = (
  candidate: Candidate,
  recipientType: RecipientType,
  fieldVisibility: FieldVisibility,
  fieldOrder?: string[]
): string => {
  const visibleFields: { key: string; label: string; value: any }[] = [];

  const allPossibleFields: { key: string; label: string; value: any }[] = [];

  const standardFieldKeys: (keyof Candidate)[] = [
    'name', 'phone', 'email', 'salary', 'expected_ctc',
    'notice', 'totalExperienceYears', 'location', 'cvUrl',
    'currentCompanyName', 'skills', 'education', 'jobTitle'
  ];

  standardFieldKeys.forEach(key => {
    // Check if the field is present on the candidate, and visible for the recipient type
    if (candidate[key] !== undefined && fieldVisibility[key] && fieldVisibility[key][recipientType]) {
      let value = candidate[key];
      // Basic formatting for display
      if (Array.isArray(value)) {
        value = value.join(', ');
      } else if (typeof value === 'number') {
        value = value.toString();
      } else if (value === null || value === undefined) {
        value = ''; // Handle null or undefined
      } else if (typeof value === 'string' && value.startsWith('http')) {
        value = `<a href="${value}" target="_blank">${value}</a>`; // Link for URLs
      }

      const label = key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

      allPossibleFields.push({ key, label, value });
    }
  });

  if (candidate.customFields) {
    Object.entries(candidate.customFields || {}).forEach(([key, value]) => {
      // Check if the custom field key is in fieldVisibility and is visible
      if (fieldVisibility[key] && fieldVisibility[key][recipientType]) {
        let customFieldValue = value;
        if (typeof customFieldValue === 'string' && customFieldValue.startsWith('http')) {
          customFieldValue = `<a href="${customFieldValue}" target="_blank">${customFieldValue}</a>`; // Link for URLs
        } else if (customFieldValue === null || customFieldValue === undefined) {
          customFieldValue = ''; // Handle null or undefined
        }

        allPossibleFields.push({ key, label: key, value }); // Use key as label for custom fields
      }

      allPossibleFields.forEach(field => {
        if(fieldVisibility[field.key]?.[recipientType]) {
          visibleFields.push(field);
        }
      })
    });

  }

  if (visibleFields.length === 0) {
    return `<p>No information is selected to be visible for this recipient type.</p>`;
  }

  const orderToUse = fieldOrder && fieldOrder.length > 0
    ? fieldOrder.filter(key => visibleFields.some(field => field.key === key)) : visibleFields.map(f => f.key);


  let newTable = `
    <table style="border-collapse: collapse; min-width: 2000px; margin: 0 auto; font-size: 14px; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 2px 10px; min-width:150px; text-align: left; border: 1px solid #ddd;">Agency Name</th>
  `

  orderToUse.forEach(fieldKey => {
    const field = visibleFields.find(f => f.key === fieldKey);
    if (field) {
      newTable += `
          <th style="padding: 2px 10px; min-width:150px; text-align: left; border: 1px solid #ddd;">${field.label}</th>
      `;
    }
  })

  newTable += `
  </tr>
    </thead>
    <tbody>
    <tr>
  `

  newTable += `
      <td style="padding: 2px 10px; min-width:150px; 10px; text-align: left; background-color:rgb(255, 255, 255); border: 1px solid #ddd;"><span style='color:red;'>Buzz</span><span style='color:blue;'>Hire</span></td>
  `

  orderToUse.forEach(fieldKey => {
    const field = visibleFields.find(f => f.key === fieldKey);
    if (field) {
      newTable += `
          <td style = "padding: 2px 10px; min-width:150px; text-align: left; background-color:rgb(255, 255, 255);border: 1px solid #ddd;">${field.value}</td>
      `;
    }
  })

  newTable += `
  </tr>
      </tbody>
    </table>
  `;

  const email = ` 
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #333; margin-bottom: 10px; font-weight:bold; font-size:30px">Candidate Information</h2>
      <p style="margin-bottom: 20px;">Please find below the details for ${candidate.name}:</p>
      ${newTable}
      <p style="margin-top: 20px;">Please let me know if you need any additional information.</p>
      <p>Best regards,</p>
    </div>
  `;

  return email;
};

export const generateSubjectLine = (
  candidate: Candidate,
  recipientType: RecipientType,
  fieldVisibility: FieldVisibility // Accept fieldVisibility
): string => {
  let subjectParts: string[] = [];

  // Always include candidate name
  if (candidate.name) {
    subjectParts.push(candidate.name);
  }

  // Add other fields based on visibility
  if (fieldVisibility['jobTitle']?.[recipientType] && candidate.jobTitle) {
    subjectParts.push(candidate.jobTitle);
  }
  if (fieldVisibility['currentCompanyName']?.[recipientType] && candidate.currentCompanyName) {
    subjectParts.push(candidate.currentCompanyName);
  }
  if (fieldVisibility['location']?.[recipientType] && candidate.location) {
    subjectParts.push(candidate.location);
  }
  if (fieldVisibility['skills']?.[recipientType] && candidate.skills && candidate.skills.length > 0) {
    subjectParts.push(candidate.skills.slice(0, 3).join(', ')); // Add first 3 skills if visible
  }
  // Add more fields to the subject based on visibility here

  // Construct the final subject line
  if (subjectParts.length > 0) {
    return `Candidate: ${subjectParts.join(' - ')}`;
  }


  return `Candidate Information`; // Fallback subject
};
