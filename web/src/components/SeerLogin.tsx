import React, { FC, useState, useEffect } from 'react';
import { seerApi } from '../services/seerApi';

interface SeerLoginProps {
    onLoginSuccess: () => void;
}

export const SeerLogin: FC<SeerLoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authProvider, setAuthProvider] = useState<'jellyfin' | 'local'>('jellyfin');
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoConnecting, setIsAutoConnecting] = useState(false);
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

    const handleAutoSignIn = async () => {
        setIsAutoConnecting(true);
        setErrorMessage(null);
        try {
            const user = await seerApi.checkSession();
            setIsAutoConnecting(false);
            if (user) {
                onLoginSuccess();
            } else {
                setErrorMessage('No active delegated session found. Please enter your credentials below.');
            }
        } catch (err: unknown) {
            setIsAutoConnecting(false);
            setErrorMessage(err instanceof Error ? err.message : 'Unable to connect with delegated session.');
        }
    };

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
                <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px', margin: '0 auto 0.6em auto', display: 'block' }} aria-hidden="true">
                    <circle cx="52" cy="52" r="28" fill="#131928"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M48 96C74.5097 96 96 74.5097 96 48C96 21.4903 74.5097 0 48 0C21.4903 0 0 21.4903 0 48C0 74.5097 21.4903 96 48 96ZM80.0001 52C80.0001 67.464 67.4641 80 52.0001 80C36.5361 80 24.0001 67.464 24.0001 52C24.0001 49.1303 24.4318 46.3615 25.2338 43.7548C27.4288 48.6165 32.3194 52 38.0001 52C45.7321 52 52.0001 45.732 52.0001 38C52.0001 32.3192 48.6166 27.4287 43.755 25.2337C46.3616 24.4317 49.1304 24 52.0001 24C67.4641 24 80.0001 36.536 80.0001 52Z" fill="url(#seer_login_grad)"/>
                    <path opacity="0.2" fillRule="evenodd" clipRule="evenodd" d="M80.0002 52C80.0002 67.464 67.4642 80 52.0002 80C36.864 80 24.5329 67.9897 24.017 52.9791C24.0057 53.318 24 53.6583 24 54C24 70.5685 37.4315 84 54 84C70.5685 84 84 70.5685 84 54C84 37.4315 70.5685 24 54 24C53.6597 24 53.3207 24.0057 52.9831 24.0169C67.9919 24.5347 80.0002 36.865 80.0002 52Z" fill="#131928"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M48 12C28.1177 12 12 28.1177 12 48C12 50.2091 10.2091 52 8 52C5.79086 52 4 50.2091 4 48C4 23.6995 23.6995 4 48 4C50.2091 4 52 5.79086 52 8C52 10.2091 50.2091 12 48 12Z" fill="url(#seer_login_glow)"/>
                    <defs>
                        <linearGradient id="seer_login_grad" x1="48" y1="0" x2="117.5" y2="69.5" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#C395FC"/>
                            <stop offset="1" stopColor="#4F65F5"/>
                        </linearGradient>
                        <linearGradient id="seer_login_glow" x1="28" y1="8" x2="28" y2="48" gradientUnits="userSpaceOnUse">
                            <stop stopColor="white" stopOpacity="0.4"/>
                            <stop offset="1" stopColor="white" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                </svg>
                <h2 style={{ margin: '0 0 0.3em 0', fontSize: '1.5em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                    Seer User Sign In
                </h2>
                <div style={{ fontSize: '0.88em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    Sign in to your Seer account to manage and submit requests
                </div>
            </div>

            {/* Server Proxy Integration Status & Quick SSO Reconnect */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75em 1em',
                marginBottom: '1.5em',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--jf-palette-divider, rgba(255, 255, 255, 0.08))',
                borderRadius: 'var(--jf-card-borderRadius, 0.3em)',
                fontSize: '0.85em',
                flexWrap: 'wrap',
                gap: '0.6em'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4caf50', display: 'inline-block' }}></span>
                    <span style={{ fontWeight: 500 }}>Jellyfin Server Proxy: Active</span>
                </div>
                <button
                    type='button'
                    className='seerActionBtn'
                    onClick={handleAutoSignIn}
                    disabled={isAutoConnecting || isLoading}
                    style={{ fontSize: '0.85em', padding: '0.35em 0.75em' }}
                    title='Automatically reconnect with active Jellyfin credentials'
                >
                    <span className='material-icons' style={{ fontSize: '15px' }}>
                        {isAutoConnecting ? 'rotate_right' : 'sync'}
                    </span>
                    {isAutoConnecting ? 'Connecting...' : 'Reconnect SSO'}
                </button>
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
