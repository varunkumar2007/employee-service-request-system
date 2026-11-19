import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export default function SlaTimer({ dueDate, isBreached, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!dueDate) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(dueDate).getTime();
      const diff = target - now;

      if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(status)) {
        setTimeLeft(isBreached ? 'Breached before resolution' : 'Resolved within SLA');
        setIsOverdue(isBreached);
        setIsWarning(false);
        return;
      }

      if (diff <= 0) {
        setIsOverdue(true);
        setIsWarning(false);
        const overdueMs = Math.abs(diff);
        const hours = Math.floor(overdueMs / (1000 * 60 * 60));
        const minutes = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m overdue`);
      } else {
        setIsOverdue(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        // Warning if less than 4 hours or <= 20%
        if (hours < 4) {
          setIsWarning(true);
        } else {
          setIsWarning(false);
        }

        setTimeLeft(`${hours}h ${minutes}m remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [dueDate, isBreached, status]);

  if (!dueDate) return null;

  const isTerminal = ['RESOLVED', 'CLOSED', 'REJECTED'].includes(status);

  let badgeBg = '#f1f5f9';
  let badgeColor = '#475569';
  let badgeBorder = '#cbd5e1';
  let Icon = Clock;

  if (isTerminal) {
    if (isBreached) {
      badgeBg = '#fef2f2';
      badgeColor = '#991b1b';
      badgeBorder = '#fecaca';
      Icon = AlertCircle;
    } else {
      badgeBg = '#f0fdf4';
      badgeColor = '#166534';
      badgeBorder = '#bbf7d0';
      Icon = CheckCircle;
    }
  } else if (isOverdue || isBreached) {
    badgeBg = '#fef2f2';
    badgeColor = '#b91c1c';
    badgeBorder = '#fca5a5';
    Icon = AlertCircle;
  } else if (isWarning) {
    badgeBg = '#fffbeb';
    badgeColor = '#b45309';
    badgeBorder = '#fde68a';
    Icon = AlertTriangle;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '6px',
      backgroundColor: badgeBg,
      color: badgeColor,
      border: `1px solid ${badgeBorder}`,
      fontSize: '0.8rem',
      fontWeight: 600
    }}>
      <Icon size={14} />
      <span>{timeLeft}</span>
    </div>
  );
}
