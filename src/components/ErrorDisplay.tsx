import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import quizBG from "@/assets/quizBG.jpg";
import quizDarkBG from "@/assets/quizDarkBG.jpg";

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  isDark: boolean;
}

export const ErrorDisplay = ({ message, onRetry, isDark }: ErrorDisplayProps) => {
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4"
      style={{ 
        backgroundImage: isDark ? `url(${quizDarkBG})` : `url(${quizBG})`,
        height: '100vh',
      }}
    >
      <div className="bg-background/80 backdrop-blur-md border border-destructive/20 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground font-bai">Something went wrong</h2>
          <p className="text-muted-foreground font-noto">{message}</p>
        </div>

        {onRetry && (
          <Button 
            onClick={onRetry}
            className="w-full gap-2 font-bai"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};
