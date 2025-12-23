import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface QuizQuestionProps {
  questionNumber: number;
  questionText: string;
  quizType: string;
  options: Array<{ id: string; text: string }>;
  selectedOption?: string;
  typedAnswer?: string;
  onSelectOption: (optionId: string) => void;
  onTypeAnswer: (answer: string) => void;
  onSubmitTyping?: () => void;
  canSubmit?: boolean;
}

export const QuizQuestion = ({
  questionNumber,
  questionText,
  quizType,
  options,
  selectedOption,
  typedAnswer,
  onSelectOption,
  onTypeAnswer,
  onSubmitTyping,
  canSubmit,
}: QuizQuestionProps) => {
  // Split question text by actual newline character to handle line breaks
  const questionLines = questionText.split('\n');
  const lineCount = questionLines.length;

  // Three font sizes: Large, Medium, Small (not too small)
  const getFontSize = () => {
    // Small: only for very long questions (7+ lines or 300+ chars)
    if (lineCount > 6 || questionText.length > 300) {
      return "text-sm md:text-base";
    }
    // Medium: for moderate questions (4-6 lines or 150-300 chars)
    else if (lineCount >= 4 || questionText.length > 150) {
      return "text-base md:text-lg";
    }
    // Large: for short questions (default)
    else {
      return "text-lg md:text-xl";
    }
  };

  const [blinkingOptionId, setBlinkingOptionId] = useState<string | null>(null);

  const handleOptionClick = (optionId: string) => {
    setBlinkingOptionId(optionId);
    setTimeout(() => {
      onSelectOption(optionId);
      setBlinkingOptionId(null);
    }, 900);
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-6 flex-1 overflow-y-auto md:overflow-visible md:px-16 pb-40 md:pb-0">
      <motion.div
        className="flex-shrink-0"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="text-[25px] md:text-[40px] font-bold text-quiz-number leading-none font-sen">
          {questionNumber}
        </div>
      </motion.div>

      <div className="flex-1 space-y-3 md:space-y-4 min-h-0 flex flex-col">
        <motion.h2
          className={`font-medium text-foreground md:pt-2 font-bai ${getFontSize()} leading-relaxed`}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {questionLines.map((line, index) => (
            <span key={index}>
              {line}
              {index < questionLines.length - 1 && <br />}
            </span>
          ))}
        </motion.h2>

        {quizType === "choice" ? (
          <motion.div
            className="space-y-2 md:space-y-3 px-1"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {options.map((option, index) => (
              <div
                key={option.id}
                className="flex items-center gap-3 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="font-bold text-[1.5rem] md:text-[1.75rem] text-foreground flex-shrink-0 font-sen transition-colors group-hover:text-primary">
                  {option.id}
                </span>
                <button
                  onClick={() => handleOptionClick(option.id)}
                  className={`flex-1 text-left px-4 py-3 rounded-2xl transition-all duration-300 ${blinkingOptionId === option.id
                    ? "bg-quiz-option animate-blink-fast"
                    : (selectedOption === option.id && !blinkingOptionId)
                      ? "bg-quiz-option-hover ring-2 ring-primary"
                      : "bg-quiz-option hover:bg-quiz-option-hover"
                    }`}
                >
                  <span className="text-base md:text-base leading-relaxed font-bai text-foreground">
                    {option.text}
                  </span>
                </button>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col gap-3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Textarea
              value={typedAnswer || ""}
              onChange={(e) => onTypeAnswer(e.target.value)}
              placeholder="พิมพ์คำตอบของคุณที่นี่..."
              className="min-h-[120px] md:min-h-[150px] font-bai text-sm md:text-base bg-quiz-option"
            />
            <div className="flex justify-end">
              <button
                onClick={onSubmitTyping}
                // Always enabled now
                className={`px-6 py-2 rounded-full flex items-center gap-2 transition-all duration-200 cursor-pointer ${canSubmit
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-quiz-skip-button hover:bg-quiz-skip-button/90"
                  }`}
                style={!canSubmit ? {
                  backgroundColor: 'hsl(var(--quiz-skip-button))',
                } : undefined}
              >
                {canSubmit ? (
                  <Check
                    className="w-4 h-4"
                    style={{ color: 'hsl(var(--primary-foreground))' }}
                  />
                ) : (
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'hsl(var(--quiz-skip-button-foreground))' }}
                  >
                    Skip
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
