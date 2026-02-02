import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { QuizHeader } from "@/components/QuizHeader";
import { QuizQuestion } from "@/components/QuizQuestion";
import { QuizSummary } from "@/components/QuizSummary";
import { QuizProgress } from "@/components/QuizProgress";
import { QuizIdEntry } from "@/components/QuizIdEntry";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import quizBG from "@/assets/quizBG.jpg";
import quizDarkBG from "@/assets/quizDarkBG.jpg";
import logoLight from "@/assets/PiRAcademy_HZ_BLK.png";
import logoDark from "@/assets/PiRAcademy_HZ_WHT.png";
import customerLogo from "@/assets/siampiwat-logo.png";

// Quiz data structure from webhook
interface QuizQuestion {
  id: number;
  "quiz type": string;
  question: string;
  choices: string[];
}

interface WebhookResponse {
  customer: string;
  logo: string;
  "test name": string;
  questions: QuizQuestion[];
}

const SAMPLE_QUIZ_DATA: QuizQuestion[] = [
  {
    id: 2,
    "quiz type": "choice",
    question: "การเขียน Prompt ที่ทำให้ได้ผลลัพธ์จาก Generative AI มีประสิทธิภาพควรมีลักษณะใด",
    choices: [
      "ระบุชัดเจน มีบริบทของงาน และระบุผลลัพธ์ที่ต้องการ",
      "ใช้คำสั่งแบบเดียวกับการค้นหาข้อมูลบน Google เพราะเน้นหาข้อมูล",
      "ใช้ศัพท์เทคนิคทางด้าน AI เพื่อให้ AI เข้าใจได้ง่ายขึ้น",
      "เขียนสั้นและกระชับเพื่อให้ AI เข้าใจได้ง่าย"
    ]
  },
  {
    id: 1,
    "quiz type": "choice",
    question: '"Generative AI" หมายถึงอะไร',
    choices: [
      "ปัญญาประดิษฐ์ที่เน้นทำงานแทนคน",
      "ปัญญาประดิษฐ์เน้นงานสร้างสรรค์",
      "ปัญญาประดิษฐ์ที่หาข้อมูลในอินเทอร์เน็ทได้",
      "ปัญญาประดิษฐ์เชิงวิเคราะห์ คำนวน"
    ]
  },
  {
    id: 40,
    "quiz type": "typing",
    question: "เขียน Prompt สำหรับ Agentic AI เพื่อสร้าง Presentation จากข้อมูลที่คุณยังมีอยู่ไม่ครบถ้วน ในสถานการณ์นี้ \nสถานการณ์ คุณเป็น Business Development Manager ของบริษัท ที่กำลังพิจารณาขยายธุรกิจ E-commerce ไปยังประเทศเพื่อนบ้าน CEO ต้องการข้อมูลประกอบการตัดสินใจในการประชุม Board สัปดาห์หน้า โดยต้องมีหัวข้อดังนี้เป็นอย่างน้อย\nภาพรวมตลาด E-commerce ในภูมิภาค\nเปรียบเทียบโอกาสในแต่ละประเทศ\nความเสี่ยงและอุปสรรค\nคำแนะนำประเทศที่ควรเข้าไปก่อน\n",
    choices: []
  },
  {
    id: 39,
    "quiz type": "typing",
    question: "เขียน Prompt สำหรับ วิเคราะห์ Feedback ลูกค้าจากสถานการณ์:\nคุณเป็น Customer Experience Manager ของบริษัท ได้รับไฟล์ Excel ที่มี Feedback ลูกค้า 500 รายการจากช่องทางต่างๆ (เว็บไซต์, แอป, Call Center) ในช่วง 3 เดือนที่ผ่านมา ผู้บริหารต้องการนำข้อมูลไปใช้ในการประชุม Board ในสัปดาห์หน้า\nสิ่งที่ต้องการ:\nจัดกลุ่ม Feedback ตามประเภทปัญหา\nระบุความรุนแรงของแต่ละประเภท\nเสนอแนวทางแก้ไขเบื้องต้น\nสรุปเป็น Executive Summary สำหรับผู้บริหาร\nPrompt ที่ดี 1 Prompt สำหรับได้ผลลัพธ์นี้ควรเป็นอย่างไร",
    choices: []
  }
];

interface Answer {
  questionId: number;
  choiceAnswer?: string;
  typedAnswer?: string;
}

const Index = () => {
  const { quizid } = useParams<{ quizid: string }>();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [highestQuestionReached, setHighestQuestionReached] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [hasSummaryBeenShown, setHasSummaryBeenShown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerScale, setContainerScale] = useState(1);
  const [needsQuizId, setNeedsQuizId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preload images for performance
  useEffect(() => {
    const preloadImages = [quizBG, quizDarkBG, logoLight, logoDark];
    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const fetchQuizData = async () => {
    if (!quizid) {
      setIsLoading(false);
      setNeedsQuizId(true);
      return;
    }

    // Special redirect for ai-transformation-maturity
    if (quizid === "ai-transformation-maturity") {
      window.location.href = "https://www.piracademy.com/";
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(import.meta.env.VITE_AI_TEST_URL || 'https://auto.pirsquare.net/webhook/pir/aitest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quizid }),
      });

      if (!response.ok) {
        throw new Error('Failed to load quiz data');
      }

      const data = await response.json();
      // Extract the first item from the array response
      const quizInfo = data[0];

      // Check if customer is "not found"
      if (quizInfo?.customer === "not found") {
        setNeedsQuizId(true);
        setIsLoading(false);
        return;
      }

      setQuizData(quizInfo);
      setNeedsQuizId(false);

      // Preload customer logo if available
      if (quizInfo?.logo) {
        const img = new Image();
        img.src = quizInfo.logo;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
      console.error('Error fetching quiz data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quiz data from webhook
  useEffect(() => {
    fetchQuizData();
  }, [quizid]);

  // Monitor dark mode
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    const observer = new MutationObserver(() => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Monitor viewport height and scale container if needed
  useEffect(() => {
    const updateScale = () => {
      const viewportHeight = window.innerHeight;
      if (viewportHeight < 620) {
        // Scale down to fit: target height is 600px + padding, leave space at bottom
        const scale = (viewportHeight - 40) / 620;
        setContainerScale(Math.max(scale, 0.6)); // Minimum scale of 0.6
      } else {
        setContainerScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const questions = quizData?.questions || SAMPLE_QUIZ_DATA;
  const currentQuiz = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleStart = (name: string, email: string) => {
    setUserName(name);
    setUserEmail(email);
    setHasStarted(true);
    setStartTime(Date.now());
  };

  const parseChoices = (choices: string[]) => {
    if (!choices || choices.length === 0) return [];
    // Choices are now individual array items
    return choices.map((text, index) => ({
      id: String.fromCharCode(65 + index), // A, B, C, D
      text: text.trim(),
    }));
  };

  const getCurrentAnswer = () => {
    return answers.find(a => a.questionId === currentQuiz.id);
  };

  const handleSelectOption = (optionId: string) => {
    const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuiz.id);
    const newAnswer: Answer = { questionId: currentQuiz.id, choiceAnswer: optionId };

    if (existingAnswerIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }

    // Auto-advance to next question after 0.5 second (was 1s)
    if (currentQuestionIndex < totalQuestions - 1) {
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          setHighestQuestionReached(Math.max(highestQuestionReached, nextIndex));
          setIsTransitioning(false);
        }, 200); // Reduced from 300ms
      }, 500); // Reduced from 1000ms
    } else {
      // Last question answered, show summary
      setTimeout(() => {
        setShowSummary(true);
        setHasSummaryBeenShown(true);
      }, 500); // Reduced from 1000ms
    }
  };

  const handleTypeAnswer = (text: string) => {
    const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuiz.id);
    const newAnswer: Answer = { questionId: currentQuiz.id, typedAnswer: text };

    if (existingAnswerIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        setIsTransitioning(false);
      }, 200); // Reduced from 300ms
    }
  };

  const handleSubmitAnswers = async () => {
    setIsSubmitting(true);

    // Calculate elapsed time
    const endTime = Date.now();
    const durationMs = startTime ? endTime - startTime : 0;
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Format timer as HH:MM:SS
    const formattedTimer = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');

    // Format answers as {qid: answer text}
    const answersMap: Record<string, string> = {};
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      // For choice questions, we might want the choice text or just the ID. 
      // The requirement says "answer text". 
      // For choice, let's look up the text if possible, or send the choice ID (A, B, C...) if that's what "answer text" implies in this context.
      // Usually "answer text" for choice means the content of the choice.
      // But the previous implementation sent choice ID. 
      // Let's check the requirement: "{qid:answer text}". 
      // If I selected "A", is the text "A" or the content of A?
      // Given the prompt "answer text", I will try to send the content if available, or fall back to the ID/Typed text.

      let answerText = "";
      if (answer.typedAnswer) {
        answerText = answer.typedAnswer;
      } else if (answer.choiceAnswer) {
        // Find the choice text corresponding to the ID (A, B, C...)
        // The options are parsed in the component, but here we have the raw question object.
        // The raw question object has `choices` as string[].
        // A = index 0, B = index 1, etc.
        const choiceIndex = answer.choiceAnswer.charCodeAt(0) - 65;
        if (question && question.choices && question.choices[choiceIndex]) {
          // If we want the full text:
          answerText = question.choices[choiceIndex];
          // If we want just the letter (safer if text is long/complex):
          // answerText = answer.choiceAnswer; 
          // Let's stick to the letter for now as it's less ambiguous for data processing, 
          // UNLESS "answer text" strictly means the content. 
          // Re-reading: "answer text". I'll send the content to be safe as it's more descriptive.
          // Actually, for analysis, the letter is often better. But "answer text" usually implies the string.
          // Let's send the content string.
          answerText = question.choices[choiceIndex];
        } else {
          answerText = answer.choiceAnswer;
        }
      }

      if (question) {
        answersMap[question.id] = answerText;
      }
    });

    // Prepare submission data
    const submissionData = {
      "test id": quizid,
      "test name": quizData?.["test name"] || "AI Champion Readiness Test",
      "customer name": quizData?.customer || "Unknown",
      "tester name": userName,
      "tester email": userEmail,
      "answers": answersMap,
      "timer": formattedTimer
    };

    console.log("Submitting answers:", submissionData);

    try {
      const response = await fetch(import.meta.env.VITE_SUBMIT_URL || 'https://auto.pirsquare.net/webhook/pir/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      setShowThankYou(true);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setHighestQuestionReached(Math.max(highestQuestionReached, nextIndex));
        setIsTransitioning(false);
      }, 200); // Reduced from 300ms
    }
  };

  const currentAnswer = getCurrentAnswer();
  const hasAnswered = currentQuiz["quiz type"] === "choice"
    ? !!currentAnswer?.choiceAnswer
    : !!currentAnswer?.typedAnswer?.trim();

  // Show next arrow if user has navigated back from a question they've reached OR if they've been to summary and are on last question
  // BUT hide it for typing questions to enforce using the Skip/Check button
  const canShowNext = currentQuiz["quiz type"] !== "typing" && (
    (currentQuestionIndex < highestQuestionReached && hasAnswered) ||
    (currentQuestionIndex === totalQuestions - 1 && hasSummaryBeenShown && hasAnswered)
  );
  const canGoNext = currentQuestionIndex < totalQuestions - 1 && canShowNext;

  // Show forward to summary if on last question and summary has been shown
  const canGoToSummary = currentQuestionIndex === totalQuestions - 1 && hasSummaryBeenShown && hasAnswered;

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: isDark ? `url(${quizDarkBG})` : `url(${quizBG})`,
          height: '100vh',
        }}
      >
        <div className="text-center">
          <div className="text-xl text-foreground font-bai">Loading quiz...</div>
        </div>
      </div>
    );
  }

  if (needsQuizId) {
    return (
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{
          backgroundImage: isDark ? `url(${quizDarkBG})` : `url(${quizBG})`,
          height: '100vh',
        }}
      >
        <QuizIdEntry isDark={isDark} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={fetchQuizData}
        isDark={isDark}
      />
    );
  }

  if (!hasStarted) {
    return (
      <WelcomeScreen
        onStart={handleStart}
        testName={quizData?.["test name"] || "AI Champion Readiness Test"}
        customerLogoUrl={quizData?.logo || customerLogo}
      />
    );
  }





  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat md:p-4 md:p-8 flex items-start justify-center pt-0 md:pt-[calc(10vh-50px)]"
      style={{
        backgroundImage: isDark ? `url(${quizDarkBG})` : `url(${quizBG})`,
        height: '100dvh',
        overflow: 'hidden'
      }}
    >
      <div className="relative w-full max-w-[1100px] h-full md:h-auto min-h-[600px] flex flex-col items-center justify-center">
        {/* Layer 0: Thank You Screen (Behind) */}
        {showThankYou && (
          <div
            className="absolute inset-0 flex flex-col z-0 p-6 md:p-4 lg:p-5"
            style={{
              transform: `scale(${containerScale})`,
              transformOrigin: 'top center',
            }}
          >
            <QuizHeader
              title={quizData?.["test name"] || "AI Champion Readiness Test"}
              userName={userName}
              startTime={startTime}
              hideTimer={true}
              hideUserName={true}
              hideThemeToggle={true}
            />

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 md:space-y-10">
              <img
                src={quizData?.logo || customerLogo}
                alt="Customer Logo"
                className="h-16 md:h-24 opacity-90"
                loading="eager"
              />

              <h1 className="text-3xl md:text-5xl font-bold text-foreground font-bai text-center">
                ขอบคุณสำหรับการทำแบบทดสอบ
              </h1>
              <p className="text-lg md:text-2xl text-muted-foreground font-noto text-center">
                คำตอบของคุณถูกส่งเรียบร้อยแล้ว
              </p>
            </div>
          </div>
        )}

        {/* Layer 1: Quiz Container (Top) */}
        <AnimatePresence mode="wait">
          {!showThankYou && (
            <motion.div
              key="quiz-container"
              className="w-full h-full flex flex-col relative z-10"
              style={{
                transform: `scale(${containerScale})`,
                transformOrigin: 'top center',
              }}
              exit={{
                y: [0, -20, 1000],
                opacity: [1, 1, 0],
                transition: { duration: 0.8, times: [0, 0.2, 1], ease: "easeInOut" }
              }}
            >
              <div className="bg-background md:bg-background/65 md:backdrop-blur-sm md:rounded-2xl md:rounded-3xl md:border md:border-white/10 p-6 md:p-4 lg:p-5 md:shadow-2xl flex flex-col h-full overflow-hidden md:h-[600px]">
                <QuizHeader
                  title={quizData?.["test name"] || "AI Champion Readiness Test"}
                  userName={userName}
                  startTime={startTime}
                />

                <div className="mt-2 md:mt-8"></div>

                <div className="flex-1 flex flex-col justify-between min-h-0 pb-0 md:pb-0">
                  <AnimatePresence mode="wait">
                    {showSummary ? (
                      <motion.div
                        key="summary"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex-1 flex flex-col min-h-0"
                      >
                        <QuizSummary
                          userName={userName}
                          testName={quizData?.["test name"] || "AI Champion Readiness Test"}
                          totalQuestions={totalQuestions}
                          onSubmit={handleSubmitAnswers}
                          isSubmitting={isSubmitting}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="flex-1 flex flex-col min-h-0"
                      >
                        <QuizQuestion
                          questionNumber={currentQuestionIndex + 1}
                          questionText={currentQuiz.question}
                          quizType={currentQuiz["quiz type"]}
                          options={parseChoices(currentQuiz.choices)}
                          selectedOption={currentAnswer?.choiceAnswer}
                          typedAnswer={currentAnswer?.typedAnswer}
                          onSelectOption={handleSelectOption}
                          onTypeAnswer={handleTypeAnswer}
                          onSubmitTyping={() => {
                            if (currentQuestionIndex < totalQuestions - 1) {
                              setTimeout(() => {
                                const nextIndex = currentQuestionIndex + 1;
                                setCurrentQuestionIndex(nextIndex);
                                setHighestQuestionReached(Math.max(highestQuestionReached, nextIndex));
                              }, 200);
                            } else {
                              // Last question answered, show summary
                              setTimeout(() => {
                                setShowSummary(true);
                                setHasSummaryBeenShown(true);
                              }, 200);
                            }
                          }}
                          canSubmit={!!currentAnswer?.typedAnswer?.trim()}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="hidden md:block">
                    <QuizProgress
                      currentQuestion={showSummary ? totalQuestions : currentQuestionIndex + 1}
                      totalQuestions={totalQuestions}
                      canGoNext={showSummary ? false : (canGoNext || canGoToSummary)}
                      onPrevious={showSummary ? () => {
                        setShowSummary(false);
                        setCurrentQuestionIndex(totalQuestions - 1);
                      } : handlePrevious}
                      onNext={showSummary ? () => { } : (canGoToSummary ? () => setShowSummary(true) : handleNext)}
                      isLastQuestion={showSummary}
                      quizType={showSummary ? "choice" : currentQuiz["quiz type"]}
                      customerLogoUrl={quizData?.logo}
                      isMobile={false}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Footer (Fixed to Viewport) */}
        {!showThankYou && !isLoading && !needsQuizId && hasStarted && (
          <div className="md:hidden">
            <QuizProgress
              currentQuestion={showSummary ? totalQuestions : currentQuestionIndex + 1}
              totalQuestions={totalQuestions}
              canGoNext={showSummary ? false : (canGoNext || canGoToSummary)}
              onPrevious={showSummary ? () => {
                setShowSummary(false);
                setCurrentQuestionIndex(totalQuestions - 1);
              } : handlePrevious}
              onNext={showSummary ? () => { } : (canGoToSummary ? () => setShowSummary(true) : handleNext)}
              isLastQuestion={showSummary}
              quizType={showSummary ? "choice" : currentQuiz["quiz type"]}
              customerLogoUrl={quizData?.logo}
              isMobile={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
