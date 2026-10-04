import React, { FC } from 'react';
import ReactDOM from 'react-dom';

interface SeerModalWrapperProps {
    isGlassTheme?: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const SeerModalWrapper: FC<SeerModalWrapperProps> = ({ isGlassTheme, onClose, children }) => {
    return ReactDOM.createPortal(
        <div
            className={`seerModalBackdrop ${isGlassTheme ? 'seerGlassTheme' : ''}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="seerModalStage" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>,
        document.body
    );
};
