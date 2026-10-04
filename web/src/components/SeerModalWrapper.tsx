import React, { FC, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface SeerModalWrapperProps {
    isGlassTheme?: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const SeerModalWrapper: FC<SeerModalWrapperProps> = ({ isGlassTheme, onClose, children }) => {
    // Prevent background content from scrolling while modal is open
    useEffect(() => {
        const root = document.getElementById('seerPluginRoot');
        if (root) {
            const prevOverflow = root.style.overflowY;
            root.style.overflowY = 'hidden';
            return () => {
                root.style.overflowY = prevOverflow || 'auto';
            };
        }
    }, []);

    return ReactDOM.createPortal(
        <div className={`seerModalBackdrop ${isGlassTheme ? 'seerGlassTheme' : ''}`} onClick={onClose}>
            {children}
        </div>,
        document.body
    );
};
