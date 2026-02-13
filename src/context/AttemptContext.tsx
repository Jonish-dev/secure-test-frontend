import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { startAttempt, submitAttempt, logEvents, getAttemptStatus } from '../api/client';
import type { EventLog, Question } from '../types';

export interface AttemptContextType {
    attemptId: string | null;
    status: 'idle' | 'active' | 'submitted' | 'expired';
    timeLeft: number;
    violations: number;
    questions: Question[];
    currentQuestionIndex: number;
    answers: Record<string, string>;
    connectionError: boolean;
    setConnectionError: (err: boolean) => void;
    modal: {
        show: boolean;
        title: string;
        body: string;
        type: 'warning' | 'error' | 'success' | 'confirm';
        onConfirm?: () => void;
    };
    setModal: (modal: AttemptContextType['modal']) => void;
    setAnswer: (questionId: string, text: string) => void;
    startAssessment: () => Promise<void>;
    submitAssessment: (force?: boolean) => Promise<void>;
    logEvent: (type: EventLog['eventType'], metadata?: any) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
}

const QUESTIONS: Question[] = [
    { id: 'q1', text: 'Explain the difference between authentication and authorization.' },
    { id: 'q2', text: 'What are the main principles of Clean Architecture?' },
    { id: 'q3', text: 'How does React Context API work under the hood?' },
    { id: 'q4', text: 'What is the purpose of UseEffect dependencies in React?' },
    { id: 'q5', text: 'Explain the concept of immutability in programming.' },
    { id: 'q6', text: 'What is the role of middleware in an Express.js application?' }
];

const AttemptContext = createContext<AttemptContextType | undefined>(undefined);

export const AttemptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [attemptId, setAttemptId] = useState<string | null>(localStorage.getItem('attemptId'));
    const [status, setStatus] = useState<AttemptContextType['status']>(
        (localStorage.getItem('assessmentStatus') as AttemptContextType['status']) || 'idle'
    );
    const [timeLeft, setTimeLeft] = useState(0);
    const [violations, setViolations] = useState(0);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('assessmentAnswers');
        return saved ? JSON.parse(saved) : {};
    });

    const [connectionError, setConnectionError] = useState(false);
    const [modal, setModal] = useState<AttemptContextType['modal']>({
        show: false,
        title: '',
        body: '',
        type: 'warning'
    });

    const eventQueue = useRef<EventLog[]>([]);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        localStorage.setItem('assessmentStatus', status);
    }, [status]);

    useEffect(() => {
        localStorage.setItem('assessmentAnswers', JSON.stringify(answers));
    }, [answers]);

    useEffect(() => {
        if (attemptId) {
            // Check if this is a page refresh during an active test (Security Hardening)
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const isRefresh = navEntry?.type === 'reload';
            const savedStatus = localStorage.getItem('assessmentStatus');

            if (isRefresh && savedStatus === 'active') {
                logEvent('tab_switch', { detail: 'page_refresh_detected' });
                setStatus('expired');
                localStorage.setItem('assessmentStatus', 'expired');
            } else {
                syncStatus();
            }
        }
    }, []);

    const setAnswer = (questionId: string, text: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: text }));
    };

    const syncStatus = async () => {
        if (!attemptId) return;
        try {
            const data = await getAttemptStatus(attemptId);
            setStatus(data.status);
            setTimeLeft(data.remainingTime);
            setViolations(data.violations);
            setConnectionError(false);

            if (data.status === 'expired') {
                localStorage.removeItem('attemptId');
            }
        } catch (error) {
            console.error("Failed to sync status", error);
            setConnectionError(true);
        }
    };

    const startAssessment = async () => {
        try {
            const data = await startAttempt();
            setAttemptId(data.attemptId);
            setStatus('active');
            setTimeLeft(data.duration);
            setConnectionError(false);
            localStorage.setItem('attemptId', data.attemptId);
            localStorage.setItem('assessmentStatus', 'active');
        } catch (error) {
            console.error("Failed to start attempt", error);
            setConnectionError(true);
        }
    };

    const performSubmission = async () => {
        if (!attemptId) return;
        try {
            await submitAttempt(attemptId);
            setStatus('submitted');
            localStorage.setItem('assessmentStatus', 'submitted');
            setModal({ show: false, title: '', body: '', type: 'success' });
        } catch (error) {
            console.error("Failed to submit attempt", error);
            setConnectionError(true);
            setModal({
                show: true,
                title: 'Submission Failed',
                body: 'Could not connect to the server. Your work is saved locally, please retry.',
                type: 'error'
            });
        }
    };

    const submitAssessment = async (force: boolean = false) => {
        if (!attemptId) return;

        // Validation only if not forced (manual submission)
        if (!force) {
            const unanswered = QUESTIONS.filter(q => !answers[q.id] || answers[q.id].trim() === '');

            if (unanswered.length > 0) {
                const bodyMsg = unanswered.length === QUESTIONS.length
                    ? "You haven't answered any questions. Are you sure you want to submit?"
                    : `You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`;

                setModal({
                    show: true,
                    title: 'Incomplete Assessment',
                    body: bodyMsg,
                    type: 'warning',
                    onConfirm: performSubmission
                });
                return;
            } else {
                setModal({
                    show: true,
                    title: 'Final Submission',
                    body: 'Are you sure you want to finalize your submission? You will not be able to change your answers.',
                    type: 'confirm',
                    onConfirm: performSubmission
                });
                return;
            }
        }

        await performSubmission();
    };

    const logEvent = (type: EventLog['eventType'], metadata?: any) => {
        if (status !== 'active') return;

        const event: EventLog = {
            eventType: type,
            timestamp: new Date().toISOString(),
            questionId: QUESTIONS[currentQuestionIndex].id,
            metadata
        };
        eventQueue.current.push(event);
        console.log(`[LOG] ${type}`, metadata);

        const violationTypes = ['tab_switch', 'blur', 'copy', 'paste', 'context_menu', 'devtools_open', 'fullscreen_exit'];
        if (violationTypes.includes(type)) {
            const isImmediateTerminationType = ['tab_switch', 'fullscreen_exit', 'blur'].includes(type);

            setViolations(prev => {
                const next = isImmediateTerminationType ? 5 : prev + 1;
                if (next >= 5) {
                    // Snappy immediate exit - local state update
                    setStatus('expired');
                }
                return next;
            });
            // Immediate flush on violation for authoritative sync
            flushLogs();
        }
    };

    const flushLogs = async () => {
        if (eventQueue.current.length > 0 && attemptId && status === 'active') {
            const eventsToSend = [...eventQueue.current];
            eventQueue.current = [];
            try {
                const res = await logEvents(attemptId, eventsToSend);
                setConnectionError(false);
                // Backend is the source of truth for status and violations
                if (res.status === 'expired') {
                    setStatus('expired');
                    localStorage.removeItem('attemptId');
                }
                if (res.violations !== undefined) {
                    setViolations(res.violations);
                }
            } catch (error) {
                console.error("Failed to send logs", error);
                setConnectionError(true);
                // Put back events to retry, but skip if we already terminated locally
                if (status === 'active') {
                    eventQueue.current = [...eventsToSend, ...eventQueue.current];
                }
            }
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            logEvent('question_navigation', { from: currentQuestionIndex, to: currentQuestionIndex + 1 });
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
            logEvent('question_navigation', { from: currentQuestionIndex, to: currentQuestionIndex - 1 });
        }
    };

    // Periodic event flush & status sync
    useEffect(() => {
        const interval = setInterval(flushLogs, 5000);
        return () => clearInterval(interval);
    }, [attemptId, status, currentQuestionIndex]);

    useEffect(() => {
        if (status === 'active' && timeLeft > 0) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        syncStatus(); // Sync final expiry with backend
                        return 0;
                    }
                    if (prev === 60) {
                        logEvent('warning_threshold', { threshold: '60s' });
                    }
                    return prev - 1;
                });
            }, 1000);

            // Frequent backend sync to prevent client-side timer drift
            const syncInterval = window.setInterval(syncStatus, 10000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
                clearInterval(syncInterval);
            };
        }
    }, [status]);

    return (
        <AttemptContext.Provider value={{
            attemptId, status, timeLeft, violations,
            questions: QUESTIONS, currentQuestionIndex,
            answers, setAnswer,
            connectionError, setConnectionError,
            modal, setModal,
            startAssessment, submitAssessment, logEvent,
            nextQuestion, prevQuestion
        }}>
            {children}
        </AttemptContext.Provider>
    );
};

export const useAttempt = () => {
    const context = useContext(AttemptContext);
    if (!context) throw new Error("useAttempt must be used within AttemptProvider");
    return context;
};
