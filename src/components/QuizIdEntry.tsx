import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const LOGO_URL = "https://lh3.googleusercontent.com/d/1477-_r60UzCJcOHW9GKzkjBwOvDC7x_0";

interface QuizIdEntryProps {
  isDark: boolean;
}

export const QuizIdEntry = ({ isDark }: QuizIdEntryProps) => {
  const navigate = useNavigate();
  const [quizId, setQuizId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizId.trim()) {
      navigate(`/form/${quizId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <img
        src={LOGO_URL}
        alt="PiR Academy Logo"
        className="h-20 md:h-24 mb-8"
      />

      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-bai">
          กรุณากรอก Form ID
        </h1>
        <p className="text-muted-foreground font-noto">
          Please enter your Form ID to start the test
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 px-6">
        <Input
          type="text"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          placeholder="Enter Form ID"
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
