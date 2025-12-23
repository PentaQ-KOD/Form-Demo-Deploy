import { useState, useEffect } from "react";

interface QuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  isLastQuestion: boolean;
  quizType: string;
  customerLogoUrl?: string;
  isMobile?: boolean;
}

export const QuizProgress = ({
  currentQuestion,
  totalQuestions,
  canGoNext,
  onPrevious,
  onNext,
  isLastQuestion,
  quizType,
  customerLogoUrl,
  isMobile = false,
}: QuizProgressProps) => {
  const showPrevious = currentQuestion > 1;
  const showNext = canGoNext && !isLastQuestion;
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate the width for each bar segment
  // On mobile, we want to fit within the screen width minus padding and other elements
  // User requested 75% of screen width for the progress bar area
  const mobileMaxWidth = Math.max(200, windowWidth * 0.75 - 80); // 80px for arrows/gaps
  const maxProgressWidth = Math.min(500, mobileMaxWidth);

  // Calculate segment width based on available space
  const segmentWidth = Math.min(40, maxProgressWidth / totalQuestions);

  const completedCount = currentQuestion - 1;
  const remainingCount = totalQuestions - currentQuestion;

  const mobileClasses = "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1100px] z-50 bg-gradient-to-t from-background via-background/80 to-transparent backdrop-blur-sm px-4 min-h-[64px] h-auto pb-[env(safe-area-inset-bottom)] flex flex-row items-center justify-between gap-3 pointer-events-none";
  const desktopClasses = "w-full mt-4 pt-4 flex flex-row items-center justify-between gap-3 pointer-events-none";

  return (
    <footer className={isMobile ? mobileClasses : desktopClasses}>
      {customerLogoUrl && (
        <img
          src={customerLogoUrl}
          alt="Customer Logo"
          className={`opacity-90 transition-none pointer-events-auto ${isMobile ? "h-10" : "h-16"}`}
        />
      )}

      <div className={`flex flex-col gap-3 pointer-events-auto ${isMobile ? "items-end" : "items-center w-auto"}`}>
        <div className={`flex items-center gap-2 w-full justify-end ${!isMobile && "gap-3 justify-center w-auto"}`}>
          <button
            onClick={onPrevious}
            disabled={!showPrevious}
            className={`w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] transition-colors ${showPrevious
              ? "border-r-quiz-nav-button hover:opacity-70 cursor-pointer"
              : "border-r-transparent cursor-not-allowed"
              }`}
            aria-label="Previous question"
          />

          <div className={`flex items-center gap-1.5 relative ${!isMobile && "gap-2"}`}>
            {completedCount > 0 && (
              <div
                className="h-[10px] bg-quiz-progress-complete rounded-full transition-all duration-300"
                style={{ width: `${completedCount * segmentWidth}px` }}
              />
            )}

            <div className="relative flex items-center justify-center">
              <span className="absolute -top-5 text-xs text-foreground font-medium font-sen whitespace-nowrap">
                {currentQuestion}/{totalQuestions}
              </span>
              <div className="w-[10px] h-[10px] bg-quiz-indicator rounded-full transition-all duration-300 shadow-md flex-shrink-0" />
            </div>

            {remainingCount > 0 && (
              <div
                className="h-[10px] bg-quiz-progress-remaining rounded-full transition-all duration-300"
                style={{ width: `${remainingCount * segmentWidth}px` }}
              />
            )}
          </div>

          {showNext && (
            <button
              onClick={onNext}
              className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-quiz-nav-button hover:opacity-70 cursor-pointer transition-colors"
              aria-label="Next question"
            />
          )}

          {!showNext && <div className="w-[8px]" />}
        </div>
      </div>

      {!isMobile && <div className="w-[100px]" />}
    </footer>
  );
};
