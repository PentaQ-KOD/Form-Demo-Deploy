import { useEffect, useState } from "react";

interface TimerProps {
  startTime: number | null;
}

export const Timer = ({ startTime }: TimerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [showColon, setShowColon] = useState(true);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setShowColon(prev => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, []);

  if (!startTime) {
    return <span className="font-orbitron text-muted-foreground">00:00</span>;
  }

  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="font-orbitron text-muted-foreground">
      {String(minutes).padStart(2, '0')}
      <span className={`transition-opacity duration-200 ${showColon ? 'opacity-100' : 'opacity-30'}`}>:</span>
      {String(seconds).padStart(2, '0')}
    </span>
  );
};
