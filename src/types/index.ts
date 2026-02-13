export interface Attempt {
    attemptId: string;
    serverStartTime: string;
    duration: number;
    status: 'active' | 'submitted' | 'expired';
    violations: number;
}

export interface EventLog {
    eventType:
    | 'tab_switch'
    | 'blur'
    | 'copy'
    | 'paste'
    | 'context_menu'
    | 'devtools_open'
    | 'timer_sync'
    | 'timer_started'
    | 'timer_expired'
    | 'warning_threshold'
    | 'fullscreen_exit'
    | 'fullscreen_enter'
    | 'focus_return'
    | 'question_navigation'
    | 'auto_submission_triggered'
    | 'manual_submission';
    timestamp: string;
    questionId?: string;
    metadata?: any;
}

export interface Question {
    id: string;
    text: string;
}

export interface AttemptContextType {
    attemptId: string | null;
    status: 'idle' | 'active' | 'submitted' | 'expired';
    timeLeft: number;
    violations: number;
    questions: Question[];
    currentQuestionIndex: number;
    startAssessment: () => Promise<void>;
    submitAssessment: () => Promise<void>;
    logEvent: (type: EventLog['eventType'], metadata?: any) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
}
