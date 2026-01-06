# Product Requirements Document (PRD)

## 1. Product Overview
**PiR Paperform** is a dynamic, web-based form builder and submission system designed to create customizable forms without code changes. Forms are configured via Google Sheets, served through n8n webhooks, and support multiple question types, file uploads, email notifications, and Google Sheets integration for response collection.

## 2. Core Features

### 2.1 Dynamic Form Loading
- **Access URL**: Users access forms via `/form/:formId` (e.g., `domain.com/form/survey-2024`)
- **Configuration Source**: Forms are fetched from Google Sheets via n8n webhook
- **Real-time Updates**: Form changes in Google Sheets are reflected immediately without code deployment

### 2.2 Supported Question Types
1. **Text** (`text`)
   - Single-line or multi-line (textarea) input
   - Supports placeholder and required validation
   
2. **Email** (`email`)
   - Email validation with regex pattern
   - Auto-format validation with real-time feedback
   
3. **Phone** (`phone`)
   - Thai phone number validation (08x, 09x, 02x formats)
   - Real-time validation with format hints
   
4. **Choices** (`choices`)
   - Single or multiple selection
   - Renders as button group with modern UI
   
5. **Dropdown** (`dropdown`)
   - Select dropdown with "Other" option support
   - Shows text input when "อื่นๆ" is selected
   
6. **Rating** (`rating`)
   - Star rating system (default: 5 stars)
   - Configurable max rating (1-10)
   
7. **Date** (`date`)
   - Native date picker
   - Thai locale support
   
8. **File** (`file`)
   - File upload with drag-and-drop UI
   - File type restrictions (accept parameter)
   - File size validation (maxSize in MB)
   - Converts to Base64 for n8n processing

### 2.3 Form Modes
1. **Single Mode** (default)
   - All questions displayed on one scrollable page
   - Two-column layout on desktop (responsive)
   - Questions with `fullWidth: true` span both columns
   - Submit button at the bottom

2. **Quiz Mode**
   - One question per page
   - Previous/Next navigation buttons
   - Progress indicator
   - Submit on last question

## 3. User Flow

### 3.1 Form Access
1. User navigates to `/form/:formId`
2. System fetches form configuration from webhook
3. Loading state shows while fetching
4. Error state if form not found or fetch fails

### 3.2 Form Interaction
1. **Loading State**: Displays skeleton loaders
2. **Form Display**:
   - Shows form title and description (if provided)
   - Displays logo (if configured)
   - Renders questions based on form mode
   - Real-time validation for email/phone fields
   
3. **Validation**:
   - Required field validation on submit (or per-question in quiz mode)
   - Format validation for email and phone
   - File size/type validation
   - Scrolls to first error with toast notification
   
4. **Submission**:
   - Shows loading state during submission
   - Converts files to Base64 with metadata
   - Sends payload to n8n webhook
   - Handles success/error responses

### 3.3 Post-Submission
1. **Success URL Redirect**: If `successUrl` is configured, redirects immediately
2. **Thank You Screen**: Shows personalized message with user's name
3. **Return to Home**: Button to navigate back to homepage

## 4. Technical Architecture

### 4.1 Frontend
- **Framework**: React (Vite)
- **Routing**: React Router v6 (`/form/:formId`)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Language**: TypeScript
- **State Management**: Local `useState` (no global state library)
- **Notifications**: Sonner (toast notifications)

### 4.2 Backend Integration
1. **Fetch Form Config**:
   - `POST` to `VITE_FORM_FETCH_URL` (default: `https://auto.pirsquare.net/webhook-test/pir/form`)
   - Payload: `{ form_id: string }`
   - Response: Form configuration JSON

2. **Submit Form**:
   - `POST` to `VITE_FORM_SUBMIT_URL` (default: `https://auto.pirsquare.net/webhook-test/pir/form/submit`)
   - Payload:
     ```json
     {
       "form_id": "string",
       "form_title": "string",
       "answers": { "question_id": "answer_value" },
       "questions": [Question],
       "notify_emails": "email1,email2",
       "slack_channel": "channel_id",
       "response_sheet": "sheet_url",
       "drive_url": "drive_folder_url",
       "sender_email": "email@example.com",
       "sender_name": "Sender Name",
       "submitted_at": "timestamp"
     }
     ```

### 4.3 n8n Workflow Integration
The backend n8n workflow handles:
- **Google Sheets Lookup**: Fetches form config by `form_id`
- **File Processing**: Extracts Base64 files and uploads to Google Drive
- **Email Notifications**:
  - Admin notification (to `notify_emails`)
  - User confirmation email (to email field in form)
  - Dynamic sender info (`sender_email`, `sender_name`)
- **Slack Integration**: Posts submission to configured Slack channel
- **Response Logging**: Appends submission data to Google Sheets

## 5. Form Configuration Schema

See [`FORM_SCHEMA.md`](file:///Users/pentaq/Documents/GitHub/pir-paperform/FORM_SCHEMA.md) for complete configuration documentation.

### 5.1 Base Structure
```typescript
interface FormConfig {
  title: string;                  // Form title
  description?: string;           // Form description
  questions: Question[];          // Array of questions
  logoUrl?: string;               // Logo image URL
  successUrl?: string;            // Redirect after submission
  notifyEmails?: string;          // Admin notification emails (comma-separated)
  slackChannel?: string;          // Slack channel for notifications
  responseSheet?: string;         // Google Sheets URL for logging
  formMode?: 'single' | 'quiz';   // Display mode
  driveUrl?: string;              // Google Drive folder for file uploads
  senderEmail?: string;           // Email sender address
  senderName?: string;            // Email sender name
}
```

### 5.2 Question Structure
```typescript
interface Question {
  id: string;                     // Unique identifier
  type: QuestionType;             // Question type
  label: string;                  // Question label
  description?: string;           // Helper text
  required?: boolean;             // Validation flag
  placeholder?: string;           // Input placeholder
  fullWidth?: boolean;            // Span full width (single mode only)
  
  // Type-specific properties
  options?: string[];             // For choices/dropdown
  choices?: string[];             // Alternative to options
  multiple?: boolean;             // For multiple choice
  multiline?: boolean;            // For text (textarea)
  maxRating?: number;             // For rating (default: 5)
  accept?: string;                // For file (e.g., ".pdf,.jpg")
  maxSize?: number;               // For file (MB)
}
```

## 6. UI/UX Requirements

### 6.1 Layout & Responsiveness
- **Container**: Max-width `900px`, centered
- **Mobile**: Single-column layout, full-width inputs
- **Desktop**: Two-column grid for questions (unless `fullWidth: true`)
- **Typography**: 
  - Thai font: `font-bai` (Bai Jamjuree)
  - Responsive text sizes
- **Colors**: Uses Tailwind theme (customizable)

### 6.2 Form Styling
- **Input Fields**: 
  - Class: `pir-form-input`
  - Consistent padding, border-radius, and focus states
  - Error state: Red border with ring
- **Choice Buttons**:
  - Pill-style with hover effects
  - Selected state with primary color
  - Multiple selection shows checkmarks
- **File Upload**:
  - Drag-and-drop zone with upload icon
  - File preview with remove button
- **Rating**: Star icons with hover animation

### 6.3 Validation Feedback
- **Real-time**: Email and phone validated on input
- **On Submit**: All required fields checked
- **Error Display**:
  - Toast notification with error message
  - Red border on invalid fields
  - Scroll to first error
- **Thai Language**: All validation messages in Thai

### 6.4 Loading & Error States
- **Loading**: Skeleton loaders for questions
- **Error**: Alert icon with error message and retry button
- **Submitting**: Disabled form with loading spinner
- **Thank You**: Success icon with personalized message

## 7. Google Sheets Structure

### 7.1 Configuration Sheet
| Column | Description |
|--------|-------------|
| `form id` | Unique form identifier (used in URL) |
| `form title` | Form display title |
| `form description` | Optional description |
| `form definition` | JSON string with questions array |
| `form mode` | "single" or "quiz" |
| `logo url` | URL to logo image |
| `success url` | Redirect URL after submit |
| `notify emails` | Comma-separated admin emails |
| `slack channel` | Slack channel ID |
| `response sheet` | Google Sheets URL for responses |
| `drive url` | Google Drive folder for files |
| `sender email` | Email sender address |
| `sender name` | Email sender display name |

### 7.2 Response Sheet
Automatically populated by n8n workflow:
- Timestamp
- Form ID
- User responses (one column per question)
- File links (Google Drive URLs)

## 8. Key Features Implemented

### 8.1 Email System
- **Dynamic Sender**: Uses `sender_email` and `sender_name` from config
- **Dual Notifications**:
  - Admin: Sent to `notify_emails`
  - User: Sent to email field in form (auto-detected)
- **Email Content**:
  - HTML formatted with form branding
  - Includes all responses
  - Links to response sheet and uploaded files

### 8.2 File Upload System
- **Frontend**: Converts files to Base64 with metadata
- **n8n Processing**:
  - Decodes Base64
  - Uploads to Google Drive (folder specified by `drive_url`)
  - Returns shareable link
  - Includes link in email and response sheet

### 8.3 Slack Integration
- Posts formatted message to specified channel
- Includes form title, timestamp, and key responses
- Configurable via `slackChannel` in Google Sheets

### 8.4 Validation System
- **Client-side**: Real-time format validation
- **Thai Phone Format**: 
  - Mobile: `08x-xxx-xxxx`, `09x-xxx-xxxx`, `06x-xxx-xxxx`
  - Landline: `02-xxx-xxxx` and other provinces
- **Email Format**: Standard RFC email validation
- **Required Fields**: Blocks submission until complete
- **File Validation**: Type and size limits enforced

### 8.5 Dropdown "Other" Option
- Auto-detects "อื่นๆ", "อื่น ๆ", "Other" in options
- Shows text input for custom answer
- Stores as `"OptionName: CustomText"`

### 8.6 Browser Tab Title
- Dynamically sets `document.title` to form title
- Resets to "PiR Form" on unmount

## 9. Environment Variables
```env
VITE_FORM_FETCH_URL=https://auto.pirsquare.net/webhook-test/pir/form
VITE_FORM_SUBMIT_URL=https://auto.pirsquare.net/webhook-test/pir/form/submit
```

## 10. Deployment & Usage

### 10.1 Setup Process
1. Create form configuration in Google Sheets
2. Set up n8n workflow to read/write to sheets
3. Deploy frontend with correct webhook URLs
4. Share form URL: `https://your-domain.com/form/{form_id}`

### 10.2 Form Updates
- Edit Google Sheets configuration
- Changes reflected immediately (no re-deployment needed)
- Add/remove questions without touching code

## 11. Related Documentation
- **Form JSON Schema**: [`FORM_SCHEMA.md`](file:///Users/pentaq/Documents/GitHub/pir-paperform/FORM_SCHEMA.md)
- **n8n Workflow Guide**: [`n8n_file_upload_guide.md`](file:///Users/pentaq/Documents/GitHub/pir-paperform/n8n_file_upload_guide.md)
- **Sample Form Config**: [`form_schema.json`](file:///Users/pentaq/Documents/GitHub/pir-paperform/form_schema.json)
- **Example Workflow**: [`Form_Config.json`](file:///Users/pentaq/Documents/GitHub/pir-paperform/Form_Config.json)

## 12. Future Considerations
- **Conditional Logic**: Show/hide questions based on previous answers
- **Multi-page Forms**: Split into sections (beyond quiz mode)
- **Payment Integration**: Stripe/PayPal for paid forms
- **Analytics**: Track form views, completions, drop-off rates
- **A/B Testing**: Test different form variations
- **Offline Support**: Cache forms for offline submission
- **Multi-language**: Support multiple languages in one form
