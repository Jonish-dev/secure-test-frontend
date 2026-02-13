import React from 'react';
import { useAttempt } from '../context/AttemptContext';

const Timer: React.FC = () => {
    const { timeLeft, status } = useAttempt();

    if (status !== 'active') return null;

    const formatTime = (seconds: number) => {
        const totalSec = Math.floor(seconds);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isCritical = timeLeft < 60;

    return (
        <div className={`timer-display ${isCritical ? 'critical' : ''}`}>
            <span className="timer-label">TIME REMAINING</span>
            <span className="timer-value">{formatTime(timeLeft)}</span>
        </div>
    );
};

export default Timer;
