import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "./ThemeToggle";
import quizBG from "@/assets/quizBG.jpg";
import quizDarkBG from "@/assets/quizDarkBG.jpg";
import logoLight from "@/assets/PiRAcademy_HZ_BLK.png";
import logoDark from "@/assets/PiRAcademy_HZ_WHT.png";
import customerLogo from "@/assets/siampiwat-logo.png";

interface WelcomeScreenProps {
  onStart: (name: string, email: string) => void;
  testName?: string;
  customerLogoUrl?: string;
}

export const WelcomeScreen = ({
  onStart,
  testName = "AI Champion Readiness Test",
  customerLogoUrl = customerLogo
}: WelcomeScreenProps) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    // Load saved data
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    if (savedName) setFullName(savedName);
    if (savedEmail) setEmail(savedEmail);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim() && email.trim() && consent) {
      // Save data
      localStorage.setItem('userName', fullName.trim());
      localStorage.setItem('userEmail', email.trim());
      onStart(fullName.trim(), email.trim());
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat md:p-4 md:p-8 flex items-start justify-center pt-0 md:pt-[calc(10vh-50px)]"
      style={{
        backgroundImage: isDark ? `url(${quizDarkBG})` : `url(${quizBG})`,
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div className="w-full max-w-[980px] h-full md:h-auto flex flex-col">
        <div className="bg-background md:bg-background/65 md:backdrop-blur-sm md:rounded-2xl md:rounded-3xl md:border md:border-white/10 p-6 md:p-6 lg:p-8 md:shadow-2xl flex flex-col h-full md:h-auto overflow-hidden md:min-h-[600px]">
          <header className="flex items-center justify-between mb-auto">
            <img
              src={isDark ? logoDark : logoLight}
              alt="PiR ACADEMY"
              className="h-5 md:h-7 transition-none"
            />
            <ThemeToggle />
          </header>

          <div className="flex flex-col items-center justify-center flex-1">
            <div className="w-full max-w-xl space-y-4 md:space-y-6">
              <div className="flex flex-col items-center space-y-6">
                <img
                  src={customerLogoUrl}
                  alt="Customer Logo"
                  className="h-12 md:h-18 opacity-90 transition-none"
                  style={{ transform: 'scale(1.5)' }}
                />
                <h1 className="text-xl md:text-3xl font-bold text-foreground font-noto text-center">
                  {testName}
                </h1>
              </div>

              <p className="text-sm md:text-base text-muted-foreground text-center font-bai">
                กรุณากรอกข้อมูลเพื่อเริ่มทำแบบทดสอบ
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-lg md:text-2xl font-medium text-foreground mb-3 font-bai">
                    ชื่อ-นามสกุล (Full Name)
                  </label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="กรอกชื่อ-นามสกุล"
                    className="w-full font-bai text-lg md:text-2xl h-12 md:h-16 px-4 md:px-6"
                    required
                  />
                </div>

                <div>
                  <label className="block text-lg md:text-2xl font-medium text-foreground mb-3 font-bai">
                    อีเมล (Email)
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="กรอกอีเมล"
                    className="w-full font-bai text-lg md:text-2xl h-12 md:h-16 px-4 md:px-6"
                    required
                  />
                </div>

                <div className="flex items-start space-x-3 pt-2">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked as boolean)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="consent"
                    className="text-xs md:text-sm text-muted-foreground font-noto leading-tight cursor-pointer"
                  >
                    ยินยอมให้เก็บข้อมูลส่วนบุคคล เพื่อใช้ในการจัดการและปรับปรุงบริการ
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full text-base md:text-xl h-12 md:h-14 rounded-full"
                  disabled={!fullName.trim() || !email.trim() || !consent}
                >
                  เริ่มทำแบบทดสอบ
                </Button>
              </form>
            </div>
          </div>

          <div className="mt-auto h-8" />
        </div>
      </div>
    </div>
  );
};
