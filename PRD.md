# Product Requirements Document (PRD)

## 1. Product Overview
The **Quiz Progress Orb** (internal name based on codebase) is a dynamic, web-based quiz application designed to assess user knowledge, specifically tailored for "AI Champion Readiness" or similar assessments. It fetches quiz content dynamically via a webhook based on a unique Quiz ID, allowing for flexible and customizable tests without code changes.

## 2. User Flow
1.  **Access**: User accesses the URL with a `quizid` (e.g., `domain.com/:quizid`).
    *   If `quizid` is missing or invalid, a "Quiz ID Entry" screen is shown.
2.  **Welcome**: User sees a Welcome Screen displaying the test name and customer logo.
    *   User must enter their **Name** and **Email** to start.
3.  **Quiz Interface**:
    *   User answers questions one by one.
    *   **Question Types**:
        *   **Multiple Choice**: Select one option. Auto-advances after selection (with a brief delay).
        *   **Typing**: Text input area. User types answer and manually submits to proceed.
    *   **Navigation**: Users can navigate back to previous questions. Forward navigation is restricted until the question is answered or if the user has already reached a further point.
    *   **Progress**: A progress bar/indicator shows current status.
4.  **Summary**: After the last question, a Summary Screen appears.
    *   Displays User Name, Test Name, and Total Questions.
    *   User reviews and clicks "Confirm Submission".
5.  **Completion**: A "Thank You" screen confirms submission.

## 3. Functional Requirements

### 3.1 Dynamic Content Loading
*   **Source**: Fetch data from `https://auto.pirsquare.net/webhook/pir/aitest` via POST request with `{ quizid }`.
*   **Data Validation**: Handle cases where customer is "not found" or fetch fails.
*   **Content**:
    *   `test name`: Displayed on Welcome, Header, and Summary.
    *   `logo`: Customer logo displayed on Welcome, Progress, and Thank You screens.
    *   `questions`: Array of question objects.

### 3.2 Question Handling
*   **Choice Questions**:
    *   Display question text.
    *   Display options (A, B, C, D...).
    *   Single selection logic.
*   **Typing Questions**:
    *   Display question text (supports multi-line).
    *   Text area for input.
    *   "Submit" button to confirm answer.

### 3.3 State Management
*   Track user info (Name, Email).
*   Track answers (Question ID, Selected Option or Typed Text).
*   Track progress (Current Index, Highest Reached Index).
*   Persist state during the session (React State).

### 3.4 Submission
*   Payload includes: `testerName`, `testerEmail`, `testName`, `totalQuestions`, `answers` (mapped with question text and ID), `completedAt`.
*   (Current Implementation Note: Webhook URL for submission is a placeholder `YOUR_WEBHOOK_URL` in `Index.tsx` - **Needs Implementation**).

## 4. UI/UX Requirements (Strict Constraints)
**Critical**: The application is strictly UI-constrained. The layout and aesthetics must be preserved while accommodating dynamic content.

### 4.1 Layout & Responsiveness
*   **Container (Quiz Rectangle Frame)**:
    *   **Dimensions**: Max-width `1100px`. Fixed height of `600px` on desktop (md screens).
    *   **Padding**: `p-3` (mobile), `p-4` (md), `p-5` (lg).
    *   **Styling**:
        *   Background: `bg-background` (mobile), `bg-background/65` (desktop).
        *   Effects: `backdrop-blur-sm`, `shadow-2xl` (desktop).
        *   Border: `border-white/10` (desktop).
        *   Corners: `rounded-2xl` to `rounded-3xl`.
    *   **Vertical Scaling**:
        *   Trigger: Viewport height < 620px.
        *   Behavior: Scales down using CSS transform to fit.
        *   Constraint: Minimum scale factor of `0.6`.

### 4.2 Visual Style & Components
*   **Header**:
    *   **Position**: Top of the quiz frame.
    *   **Layout**: Flex row, space-between. Margin bottom `mb-2` to `mb-3`.
    *   **Logo (Header)**: Height `20px` (mobile) to `28px` (desktop).
    *   **User Name**: Displayed in a glass-morphism box (`bg-card/70`), padding `px-3 py-2`.
*   **Customer Logo**:
    *   **Welcome/Thank You Screens**: Large, central, height `64px` to `96px`.
    *   **Quiz Progress Footer**: Height `48px` to `64px`, 90% opacity. Hidden on mobile.
*   **Question Text**:
    *   **Font**: `font-bai`.
    *   **Responsive Sizing**:
        *   **Large** (`text-lg` to `text-xl`): Default for short questions.
        *   **Medium** (`text-base` to `text-lg`): For 4-6 lines or >150 chars.
        *   **Small** (`text-sm` to `text-base`): For 7+ lines or >300 chars.
*   **Progress Bar**:
    *   **Layout**: Centered in footer.
    *   **Segments**:
        *   Completed: `h-[10px]`, color `quiz-progress-complete`.
        *   Remaining: `h-[10px]`, color `quiz-progress-remaining`.
        *   Indicator: `10px` circle (`quiz-indicator`) between segments.
    *   **Sizing**: Segment width calculated dynamically (max 500px total width / total questions), capped at 40px per segment.
    *   **Label**: Current/Total text floats above the indicator (`-top-5`).
*   **Navigation Arrows**:
    *   **Style**: CSS triangles created with borders (`border-[8px]`).
    *   **Previous Arrow**:
        *   Visible: If `currentQuestion > 1`.
        *   Action: Go back one step.
    *   **Next Arrow**:
        *   Visible: ONLY if user is backtracking (current < highest reached) OR reviewing after completion.
        *   **Strict Behavior**: Users CANNOT manually advance to a new question using the arrow. They must answer the question to proceed (auto-advance for choice, submit button for typing).

## 5. Technical Constraints
*   **Framework**: React (Vite).
*   **Styling**: Tailwind CSS + shadcn/ui.
*   **Language**: TypeScript.
*   **Routing**: `react-router-dom`.
*   **State**: Local `useState` (consider Context or Global state if complexity grows).

## 6. Data Structure (Reference)
```typescript
interface QuizQuestion {
  id: number;
  "quiz type": "choice" | "typing";
  question: string;
  choices: string[]; // Empty for typing
}

interface WebhookResponse {
  customer: string;
  logo: string;
  "test name": string;
  questions: QuizQuestion[];
}
```

## 7. Implemented Features (Previously Future Development)
*   **Submission Webhook**: 
    *   Implemented `POST` request to `https://auto.pirsquare.net/webhook/pir/submit`.
    *   Payload Format:
        ```json
        {
          "test id": "string",
          "test name": "string",
          "customer name": "string",
          "tester name": "string",
          "tester email": "string",
          "answers": { "question_id": "answer text" },
          "timer": "HH:MM:SS"
        }
        ```
    *   UI shows loading state during submission and error toast on failure.
*   **Error Handling**: 
    *   Added `ErrorDisplay` component for critical errors (e.g., fetch failure).
    *   Includes "Try Again" button to retry fetching quiz data.
    *   Transient errors use `sonner` toast notifications.
*   **Performance**: 
    *   Added image preloading for critical assets (backgrounds, logos).
    *   Used `loading="eager"` for LCP images (Customer Logo).
*   **UI/UX Improvements**:
    *   **Reduced Delay**: Auto-advance delay reduced to 500ms (from 1000ms).
    *   **Smoother Animations**: Implemented `framer-motion` with `AnimatePresence`. Parent handles exit (fade/slide left). Children handle directional entrance (Question from left, Choices from right).
    *   **Skip Button**: Typing questions now show a "Skip" button (muted red) when empty, changing to "Check" (blue) when typed.
    *   **Navigation Logic**: Forward button in footer is hidden for typing questions to enforce use of Skip/Check button.
    *   **Data Persistence**: Theme, Name, and Email are saved to `localStorage`.
    *   **Consent**: Added mandatory consent checkbox on Welcome Screen.
    *   **Exit Animation**: Entire quiz container bounces up and drops down, revealing the "Thank You" screen underneath.
    *   **Blink Effect**: Selected choice waits 300ms, blinks 2 times (brightness/border) over 600ms, then immediately advances.
    *   **Thank You Screen**: Includes header (without timer/user/toggle) and centered content (Logo, Title, Subtitle), stable layout.
