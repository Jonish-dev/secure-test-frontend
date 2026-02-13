
import React from 'react';

interface ModalProps {
    show: boolean;
    title: string;
    body: string;
    type: 'warning' | 'error' | 'success' | 'confirm';
    onConfirm?: () => void;
    onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ show, title, body, type, onConfirm, onClose }) => {
    if (!show) return null;

    const getIcon = () => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'success': return '✅';
            case 'confirm': return '❓';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card">
                <div className="modal-icon">{getIcon()}</div>
                <h2 className="modal-title">{title}</h2>
                <p className="modal-body">{body}</p>
                <div className="modal-actions">
                    {onConfirm && (
                        <button
                            className={`modal-btn ${type === 'confirm' ? 'modal-btn-primary' : 'modal-btn-danger'}`}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                        >
                            {type === 'confirm' ? 'Confirm' : 'Yes, Proceed'}
                        </button>
                    )}
                    <button className="modal-btn modal-btn-secondary" onClick={onClose}>
                        {onConfirm ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};
