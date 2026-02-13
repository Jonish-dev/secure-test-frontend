import { useEffect } from 'react';
import { useAttempt } from '../context/AttemptContext';

export const useBrowserEnforcement = () => {
    const { logEvent, status } = useAttempt();

    const getForensicMetadata = () => ({
        userAgent: navigator.userAgent,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        screenX: window.screenX,
        screenY: window.screenY,
        pixelRatio: window.devicePixelRatio,
        focusState: document.hasFocus()
    });

    useEffect(() => {
        if (status !== 'active') return;

        const handleVisibilityChange = () => {
            logEvent('tab_switch', {
                hidden: document.hidden,
                ...getForensicMetadata()
            });
        };

        const handleBlur = () => {
            logEvent('blur', getForensicMetadata());
        };

        const handleFocus = () => {
            logEvent('focus_return', getForensicMetadata());
        };

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            logEvent('copy', {
                target: (e.target as HTMLElement).tagName,
                selection: window.getSelection()?.toString().slice(0, 100), // Audit sample
                ...getForensicMetadata()
            });
        };

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            logEvent('paste', getForensicMetadata());
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            logEvent('context_menu', {
                x: e.clientX,
                y: e.clientY,
                ...getForensicMetadata()
            });
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                logEvent('fullscreen_exit', getForensicMetadata());
            } else {
                logEvent('fullscreen_enter', getForensicMetadata());
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block generic shortcuts that could be used for switching or devtools
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
                (e.altKey && e.key === 'Tab') // Alt+Tab is usually OS-level, but check anyway
            ) {
                e.preventDefault();
                logEvent('devtools_open'); // Categorize as devtools or generic breach
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [status, logEvent]);
};
