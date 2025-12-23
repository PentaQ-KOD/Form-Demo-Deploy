import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoLight from "@/assets/PiRAcademy_HZ_BLK.png";
import logoDark from "@/assets/PiRAcademy_HZ_WHT.png";

interface QuizIdEntryProps {
  isDark: boolean;
}

export const QuizIdEntry = ({ isDark }: QuizIdEntryProps) => {
  const navigate = useNavigate();
  const [quizId, setQuizId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizId.trim()) {
      navigate(`/${quizId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <img 
        src={isDark ? logoDark : logoLight}
        alt="PiR Academy Logo" 
        className="h-12 md:h-16 mb-8"
      />
      
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-bai">
          กรุณากรอก Quiz ID
        </h1>
        <p className="text-muted-foreground font-noto">
          Please enter your Quiz ID to start the test
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 px-6">
        <Input
          type="text"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          placeholder="Enter Quiz ID"
          className="text-center text-lg font-bai"
          required
        />
        <Button 
          type="submit" 
          className="w-full text-lg font-bai"
          disabled={!quizId.trim()}
        >
          Continue
        </Button>
      </form>
    </div>
  );
};
