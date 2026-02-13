import React from 'react';
import { AttemptProvider, useAttempt } from './context/AttemptContext';
import { useBrowserEnforcement } from './hooks/useBrowserEnforcement';
import Timer from './components/Timer';

import './App.css';
import { Modal } from './components/Modal';

function AssessmentContent() {
  const {
    status, attemptId, violations,
    questions, currentQuestionIndex,
    answers, setAnswer,
    connectionError, modal, setModal,
    startAssessment, submitAssessment,
    nextQuestion, prevQuestion
  } = useAttempt();

  // Activate security hooks
  useBrowserEnforcement();

  const handleStart = async () => {
    // Try to enter fullscreen before starting
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error("Error attempting to enable full-screen mode", err);
    }
    startAssessment();
  };

  const [isFullscreen, setIsFullscreen] = React.useState(!!document.fullscreenElement);

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error("Failed to re-enter fullscreen", err);
    }
  };

  // Immediate redirection to flag screen is handled by status checking
  if (status === 'idle') {
    return (
      <div className="container center">
        <div className="card">
          <h1>Secure Portal</h1>
          <p style={{ color: '#64748b', marginBottom: '2rem' }}>High-Stakes Assessment Environment</p>
          <div className="rules">
            <h3>Mandatory Rules:</h3>
            <ul>
              <li><strong>Fullscreen</strong> mode is enforced throughout.</li>
              <li><strong>Tab switching</strong> or exiting fullscreen is a critical violation.</li>
              <li>Reaching <strong>5 violations</strong> triggers <strong>immediate termination</strong>.</li>
              <li>Real-time monitoring and immutable audit logging is active.</li>
            </ul>
          </div>
          <button onClick={handleStart} className="start-btn">Confirm & Start Assessment</button>
        </div>
      </div>
    );
  }

  if (status === 'submitted' || status === 'expired') {
    // This is the "Red Flag" screen for expired/terminated attempts
    return (
      <div className="container center">
        <div className={`card ${status === 'expired' ? 'termination-card' : ''}`}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Assessment {status === 'submitted' ? 'Successfully Received' : 'Terminated'}
          </h1>

          {status === 'expired' ? (
            <div className="red-flag">
              <span>🚩</span> SECURITY ALERT: ATTEMPT RED-FLAGGED
            </div>
          ) : (
            <div style={{ color: '#10b981', background: '#ecfdf5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 700 }}>
              ✓ Your answers have been securely recorded.
            </div>
          )}

          <div className="results">
            <p><strong>Attempt ID:</strong> <code style={{ fontSize: '0.9rem' }}>{attemptId}</code></p>
            <p><strong>Result:</strong> <span className={`status-${status}`}>{status === 'expired' ? 'SECURITY TERMINATION' : 'SUCCESSFUL SUBMISSION'}</span></p>
            <p><strong>Violations Audit:</strong> {violations} / 5</p>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {status === 'expired'
              ? "Due to multiple security violations, this session was closed automatically. An incident report has been sent to the supervisor."
              : "You may now close this window. Your assessment is being processed."}
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || '';

  return (
    <div className="assessment-layout">
      {connectionError && (
        <div className="warning-banner pulse-soft" style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fee2e2' }}>
          ⚠️ Backend Connection Failed. Retrying...
        </div>
      )}

      <Modal
        {...modal}
        onClose={() => setModal({ ...modal, show: false })}
      />

      {status === 'active' && !isFullscreen && (
        <div className="fullscreen-overlay">
          <div className="fullscreen-overlay-content">
            <h2>🚨 Security Breach</h2>
            <p>Fullscreen mode is mandatory for this assessment. Leaving fullscreen has been logged as a violation.</p>
            <button onClick={() => requestFullscreen()} className="return-btn">
              Return to Fullscreen to Continue
            </button>
          </div>
        </div>
      )}

      <header className="assessment-header">
        <div className="brand">🛡️ secure<span>assessor</span></div>
        <div className="meta">
          <span>Attempt: <code>{attemptId?.slice(0, 8)}</code></span>
          <div className={`violation-badge ${violations >= 4 ? 'danger' : ''}`}>
            Violations: {violations} / 5
          </div>
        </div>
        <Timer />
        <button onClick={() => submitAssessment()} className="header-submit-btn">
          Final Submission
        </button>
      </header>

      {violations >= 4 && (
        <div className="warning-banner pulse-soft">
          CRITICAL WARNING: {5 - violations} violation(s) remaining. Any further breach will trigger immediate termination.
        </div>
      )}

      <main className="assessment-main">
        <div className="question-card">
          <div className="question-header">
            <span className="q-index">Section 1 &bull; Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          <div className="question-body">
            <p className="q-text">{currentQuestion.text}</p>
            <div className="answer-container">
              <textarea
                rows={12}
                value={currentAnswer}
                onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                placeholder="Type your response here..."
                className="answer-input"
              />
            </div>
          </div>
          <div className="question-footer">
            <div className="progress-dots">
              {questions.map((_, i) => (
                <span key={i} className={`dot ${i === currentQuestionIndex ? 'active' : ''}`} />
              ))}
            </div>
            <div className="question-footer-nav">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="nav-btn"
              >
                &larr; Previous Question
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button onClick={() => submitAssessment()} className="nav-btn finish-btn">
                  Complete Assessment
                </button>
              ) : (
                <button onClick={nextQuestion} className="nav-btn">
                  Next Question &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AttemptProvider>
      <AssessmentContent />
    </AttemptProvider>
  );
};

export default App;
