import { Timer } from "./Timer";
import { ThemeToggle } from "./ThemeToggle";
import { useEffect, useState } from "react";
import logoLight from "@/assets/PiRAcademy_HZ_BLK.png";
import logoDark from "@/assets/PiRAcademy_HZ_WHT.png";

interface QuizHeaderProps {
  title: string;
  userName?: string;
  startTime?: number | null;
  hideTimer?: boolean;
  hideUserName?: boolean;
  hideThemeToggle?: boolean;
}

export const QuizHeader = ({ title, userName, startTime, hideTimer = false, hideUserName = false, hideThemeToggle = false }: QuizHeaderProps) => {
  const [isDark, setIsDark] = useState(false);

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

  const formatUserName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return name;

    const firstName = parts[0];
    const lastNameInitial = parts[parts.length - 1].charAt(0);
    return `${firstName} ${lastNameInitial}.`;
  };

  return (
    <header className="flex flex-col w-full gap-2 md:flex-row md:items-center md:justify-between mb-2 md:mb-3">
      {/* Row 1: Logo/Title + Mobile Toggle */}
      <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-2 md:gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src={isDark ? logoDark : logoLight}
            alt="PiR ACADEMY"
            className="h-5 md:h-7 transition-none"
          />
          <span className="text-muted-foreground hidden md:inline">|</span>
          <h1 className="text-xs md:text-base font-medium text-foreground font-noto">{title}</h1>
        </div>

        {/* Mobile Theme Toggle */}
        {!hideThemeToggle && (
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        )}
      </div>

      {/* Row 2: Timer + User + Desktop Toggle */}
      <div className="flex items-center justify-end w-full gap-2 md:w-auto md:justify-start md:gap-4 flex-wrap">
        {!hideTimer && startTime && (
          <div className="px-3 py-1.5">
            <Timer startTime={startTime} />
          </div>
        )}
        {!hideUserName && userName && (
          <div className="h-8 px-4 flex items-center justify-center bg-card/70 md:bg-card rounded-full backdrop-blur-sm">
            <span className="font-medium text-xs md:text-sm text-foreground font-noto">{formatUserName(userName)}</span>
          </div>
        )}
        {/* Desktop Theme Toggle */}
        {!hideThemeToggle && (
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
};
