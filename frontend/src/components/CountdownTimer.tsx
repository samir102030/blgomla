import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  label,
  onExpire,
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calcTime = (): TimeLeft => {
      const now = new Date().getTime();
      const end = targetDate.getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        onExpire?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calcTime());
    const timer = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  if (isExpired) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-sm font-semibold text-[var(--text-muted)]">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <>
            <div className="countdown-digit">{pad(timeLeft.days)}</div>
            <span className="text-xs text-[var(--text-subtle)] font-medium mx-0.5">{t("D")}</span>
          </>
        )}
        <div className="countdown-digit">{pad(timeLeft.hours)}</div>
        <span className="countdown-separator">:</span>
        <div className="countdown-digit">{pad(timeLeft.minutes)}</div>
        <span className="countdown-separator">:</span>
        <div className="countdown-digit">{pad(timeLeft.seconds)}</div>
      </div>
    </div>
  );
};

export default CountdownTimer;
