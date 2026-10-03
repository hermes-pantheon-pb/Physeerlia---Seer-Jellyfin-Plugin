import React, { FC, useState, useEffect } from 'react';
import { seerApi } from '../services/seerApi';

interface SeerLoginProps {
    onLoginSuccess: () => void;
}

export const SeerLogin: FC<SeerLoginProps> = ({ onLoginSuccess }) => {
    const [serverUrl, setServerUrl] = useState(seerApi.getServerUrl());
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authProvider, setAuthProvider] = useState<'jellyfin' | 'local'>('jellyfin');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-detect and prefill Jellyfin logged-in username if available
    useEffect(() => {
        const w = window as any;
        const client = w.ApiClient || w.ServerConnections?.currentApiClient();
        if (client) {
            client.getCurrentUser().then((user: any) => {
                if (user?.Name && !username) {
                    setUsername(user.Name);
                }
            }).catch(() => {
                // Ignore if not logged into Jellyfin yet
            });
        }
    }, [username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!username.trim()) {
            setErrorMessage('Please enter your username or email.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await seerApi.login({
                serverUrl,
                username: username.trim(),
                password,
                authProvider
            });

            setIsLoading(false);
            if (result.success) {
                onLoginSuccess();
            } else {
                setErrorMessage(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (err: unknown) {
            setIsLoading(false);
            setErrorMessage(err instanceof Error ? err.message : 'An error occurred during authentication.');
        }
    };

    return (
        <div style={{
            maxWidth: '480px',
            margin: '2em auto 4em',
            padding: '2em',
            backgroundColor: 'var(--jf-palette-background-paper, #202020)',
            border: '1px solid var(--jf-palette-divider, rgba(255, 255, 255, 0.1))',
            borderRadius: 'var(--jf-card-borderRadius, 0.4em)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '1.8em' }}>
                <span className='material-icons' style={{
                    fontSize: '3em',
                    color: 'var(--jf-palette-primary-main, #00a4dc)',
                    marginBottom: '0.2em'
                }}>
                    account_circle
                </span>
                <h2 style={{ margin: '0 0 0.3em 0', fontSize: '1.5em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                    Seer User Sign In
                </h2>
                <div style={{ fontSize: '0.88em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    Sign in to your Seer account to manage and submit requests
                </div>
            </div>

            {errorMessage && (
                <div style={{
                    padding: '0.8em 1em',
                    marginBottom: '1.5em',
                    borderRadius: '4px',
                    fontSize: '0.88em',
                    backgroundColor: 'rgba(211, 47, 47, 0.2)',
                    border: '1px solid #d32f2f',
                    color: '#ff8a80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5em'
                }}>
                    <span className='material-icons' style={{ fontSize: '1.2em' }}>error_outline</span>
                    <span>{errorMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2em' }}>
                {/* Auth Provider Selector */}
                <div style={{ display: 'flex', gap: '0.6em' }}>
                    <button
                        type='button'
                        className={`seerFilterBtn ${authProvider === 'jellyfin' ? 'active' : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => setAuthProvider('jellyfin')}
                    >
                        Jellyfin Account (SSO)
                    </button>
                    <button
                        type='button'
                        className={`seerFilterBtn ${authProvider === 'local' ? 'active' : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => setAuthProvider('local')}
                    >
                        Local Seer Account
                    </button>
                </div>

                {/* Server URL */}
                <div className='seerFormGroup'>
                    <label>Seer Server Endpoint URL</label>
                    <input
                        type='text'
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder='http://localhost:5055'
                        required
                    />
                </div>

                {/* Username */}
                <div className='seerFormGroup'>
                    <label>{authProvider === 'local' ? 'Email / Username' : 'Jellyfin Username'}</label>
                    <input
                        type='text'
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder='Enter your username'
                        required
                    />
                </div>

                {/* Password */}
                <div className='seerFormGroup'>
                    <label>Password</label>
                    <input
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Enter your password'
                    />
                </div>

                <button
                    type='submit'
                    className='emby-button emby-button-raised raised button-submit'
                    style={{ margin: '0.6em 0 0 0', padding: '0.85em', fontSize: '1em' }}
                    disabled={isLoading}
                >
                    {isLoading ? 'Signing In...' : 'Sign In to Seer'}
                </button>
            </form>
        </div>
    );
};
