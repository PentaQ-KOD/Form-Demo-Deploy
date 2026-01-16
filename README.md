# PiR Paperform - Dynamic Form Builder

A dynamic, web-based form builder powered by Google Sheets and n8n webhooks. Create and manage forms without code changes.

## 🌟 Features

- **Dynamic Form Loading**: Forms configured in Google Sheets, no code deployment needed
- **Multiple Question Types**: Text, Paragraph, Email, Phone, Choices, Dropdown, Rating, Linear Scale, Slider, Date, File Upload
- **Form Modes**: Single (step-by-step) or Full-page (all questions at once)
- **Real-time Validation**: Email and Thai phone number validation
- **File Uploads**: Direct upload to Google Drive with Base64 encoding
- **Email Notifications**: Dual notifications (admin + user) with dynamic sender
- **Slack Integration**: Post submissions to configured Slack channels
- **Google Sheets Integration**: Automatic response logging
- **Responsive Design**: Mobile-first with elegant desktop layouts
- **Thai Language Support**: Full Thai localization for validation messages

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd pir-paperform

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your n8n webhook URLs
# Then start development server
npm run dev
```

## 📝 Environment Variables

Create a `.env` file with the following:

```env
# Form Page - Dynamic Form System
VITE_FORM_FETCH_URL=https://your-n8n-domain.com/webhook/pir/form
VITE_FORM_SUBMIT_URL=https://your-n8n-domain.com/webhook/pir/form/submit

# Index Page - AI Test/Quiz System (legacy)
VITE_AI_TEST_URL=https://your-n8n-domain.com/webhook/pir/aitest
VITE_SUBMIT_URL=https://your-n8n-domain.com/webhook/pir/submit
```

## 🎯 Usage

### Creating a Form

1. **Set up Google Sheets** with columns:
   - `form id`: Unique identifier (used in URL)
   - `form title`: Display title
   - `form description`: Optional description
   - `form definition`: JSON with questions array
   - `form mode`: "single" (step-by-step wizard) or "full-page" (scrollable page)
   - `logo url`: Optional logo
   - `success url`: Optional redirect after submission
   - `notify emails`: Admin notification emails (comma-separated)
   - `slack channel`: Slack channel ID
   - `response sheet`: Google Sheets URL for responses
   - `drive url`: Google Drive folder for file uploads
   - `sender email`: Email sender address
   - `sender name`: Email sender display name

2. **Configure n8n workflow** to:
   - Fetch form by `form_id` from Google Sheets
   - Handle form submission
   - Upload files to Google Drive
   - Send email notifications
   - Post to Slack
   - Log responses to Google Sheets

3. **Share form URL**: `https://your-domain.com/form/{form_id}`

### Form JSON Structure

See [`FORM_SCHEMA.md`](./FORM_SCHEMA.md) for complete documentation.

**Example:**
```json
{
  "title": "Customer Feedback",
  "description": "Help us improve our service",
  "questions": [
    {
      "type": "text",
      "label": "Your Name",
      "required": true
    },
    {
      "type": "email",
      "label": "Email Address",
      "required": true
    },
    {
      "type": "rating",
      "label": "Overall Satisfaction",
      "maxRating": 5,
      "required": true
    }
  ]
}
```

## 🏗️ Project Structure

```
pir-paperform/
├── src/
│   ├── pages/
│   │   ├── FormPage.tsx       # Dynamic form page (/form/:formId)
│   │   ├── Index.tsx          # Quiz/Test page (legacy)
│   │   └── NotFound.tsx       # 404 page
│   ├── components/
│   │   └── form/              # Form components (StarRating, ChoiceField)
│   └── App.tsx                # Routes configuration
├── public/                     # Static assets
├── PRD.md                      # Product requirements
├── FORM_SCHEMA.md              # Form JSON schema documentation
├── Form_Config.json            # Example n8n workflow
└── .env.example                # Environment variables template
```

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Notifications**: Sonner
- **Animations**: Framer Motion
- **Backend**: n8n (workflow automation)
- **Database**: Google Sheets
- **Storage**: Google Drive

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build for development mode
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🌐 Deployment

### Deploy to Lovable

1. Open [Lovable Project](https://lovable.dev/projects/d510ae43-2fcf-456c-9ce0-dc98dbc02780)
2. Click **Share → Publish**
3. Your app will be live!

### Deploy to Other Platforms

**Vercel / Netlify:**
```bash
npm run build
# Upload dist/ folder or connect Git repository
```

**Environment Variables**: Set the same variables from `.env` in your hosting platform's settings.

## 📚 Documentation

- **[PRD.md](./PRD.md)**: Complete product requirements document
- **[FORM_SCHEMA.md](./FORM_SCHEMA.md)**: JSON schema and examples
- **[n8n_file_upload_guide.md](./n8n_file_upload_guide.md)**: File upload workflow guide

## 🔑 Key Features Explained

### Dynamic Forms
Forms are fetched from Google Sheets via n8n webhooks, allowing non-technical users to create and update forms without touching code.

### Question Types
- **Text**: Single/multi-line input
- **Email**: With format validation
- **Phone**: Thai phone number validation (08x, 09x, 02x)
- **Choices**: Single/multiple selection buttons
- **Dropdown**: Select menu with "Other" option support
- **Rating**: Star rating (1-10)
- **Linear Scale**: Likert scale (1-5, 1-10) with custom labels
- **Slider**: Range slider (0-100)
- **Date**: Date picker
- **File**: Upload with type/size validation → Google Drive

### Validation
- Real-time validation for email and phone
- Required field enforcement
- File type and size limits
- Thai error messages

### Email System
- **Admin Email**: Sent to `notify_emails`
- **User Email**: Sent to email field in form (auto-detected)
- **Dynamic Sender**: Uses `sender_email` and `sender_name` from config
- **HTML Formatting**: Professional email templates

### File Uploads
1. User selects file
2. Frontend converts to Base64
3. Sends to n8n with metadata
4. n8n decodes and uploads to Google Drive
5. Returns shareable link
6. Link stored in response sheet and emails

## 🤝 Contributing

This is a private project managed through Lovable. To contribute:

1. Clone the repository
2. Make changes in a feature branch
3. Push to GitHub
4. Changes sync automatically with Lovable

## 📄 License

Private project - All rights reserved

## 🆘 Support

For issues or questions, please contact the project maintainer.

---

**Built with ❤️ by PiR-SQUARE Co., Ltd.**
