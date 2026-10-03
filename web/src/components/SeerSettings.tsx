import React, { FC, useState } from 'react';
import { seerApi } from '../services/seerApi';
import { SeerPermission } from '../seerPermissions';

interface SeerSettingsProps {
    onRoleChanged: () => void;
    onSignOut: () => void;
}

const BACKDROPS_STORAGE_KEY = 'seer_enable_backdrops';
const GLASS_THEME_STORAGE_KEY = 'seer_glass_theme';

export const SeerSettings: FC<SeerSettingsProps> = ({ onSignOut }) => {
    const [serverUrl, setServerUrl] = useState(seerApi.getServerUrl());
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [enableBackdrops, setEnableBackdrops] = useState<boolean>(() => {
        const stored = localStorage.getItem(BACKDROPS_STORAGE_KEY);
        return stored !== null ? stored === 'true' : true;
    });
    const [enableGlassTheme, setEnableGlassTheme] = useState<boolean>(() => {
        const stored = localStorage.getItem(GLASS_THEME_STORAGE_KEY);
        return stored !== null ? stored === 'true' : true;
    });

    const currentUser = seerApi.getCurrentUser();
    const permissions = currentUser?.permissions || 0;

    const handleToggleBackdrops = (enabled: boolean) => {
        setEnableBackdrops(enabled);
        localStorage.setItem(BACKDROPS_STORAGE_KEY, String(enabled));
        window.dispatchEvent(new CustomEvent('seer_backdrops_changed', { detail: { enabled } }));
    };

    const handleToggleGlassTheme = (enabled: boolean) => {
        setEnableGlassTheme(enabled);
        localStorage.setItem(GLASS_THEME_STORAGE_KEY, String(enabled));
        window.dispatchEvent(new CustomEvent('seer_glass_theme_changed', { detail: { enabled } }));
    };

    const handleSaveConnection = (e: React.FormEvent) => {
        e.preventDefault();
        seerApi.setServerUrl(serverUrl);
        setTestResult({ success: true, message: 'Server endpoint configuration saved.' });
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        seerApi.setServerUrl(serverUrl);
        const res = await seerApi.testConnection();
        setTestResult(res);
        setIsTesting(false);
    };

    const handleSignOutClick = async () => {
        await seerApi.logout();
        onSignOut();
    };

    const checkPermissionFlag = (flag: SeerPermission) => {
        if ((permissions & SeerPermission.ADMIN) !== 0) return true;
        return (permissions & flag) !== 0;
    };

    return (
        <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2em' }}>
            {/* Active User Session Panel */}
            <div className='seerSettingsCard' style={{ padding: '1.5em' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1em', marginBottom: '1.2em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8em' }}>
                        {currentUser?.avatar ? (
                            <img
                                src={currentUser.avatar}
                                alt={currentUser.username}
                                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span className='material-icons' style={{ fontSize: '40px', color: 'var(--jf-palette-primary-main, #00a4dc)' }}>
                                account_circle
                            </span>
                        )}
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '1.15em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                                {currentUser?.username || currentUser?.email || 'Authenticated User'}
                            </div>
                            <div style={{ fontSize: '0.82em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                Active User Session {currentUser?.email ? `• ${currentUser.email}` : ''}
                            </div>
                        </div>
                    </div>

                    <button
                        type='button'
                        className='seerSignOutBtn'
                        onClick={handleSignOutClick}
                        title='Sign Out of Seer'
                    >
                        <span className='material-icons' style={{ fontSize: '16px' }}>exit_to_app</span>
                        Sign Out of Seer
                    </button>
                </div>

                {/* Server Endpoint Form */}
                <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: '1em', borderTop: '1px solid var(--jf-palette-divider, rgba(255,255,255,0.08))', paddingTop: '1.2em' }}>
                    <div className='seerFormGroup'>
                        <label>Seer Server Endpoint URL</label>
                        <input
                            type='text'
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder='http://10.10.10.172:5055'
                        />
                        <span className='helperText'>Base URL of your Seer instance. All user requests communicate via user session cookies.</span>
                    </div>

                    {testResult && (
                        <div style={{
                            padding: '0.75em 1em',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                            backgroundColor: testResult.success ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                            border: `1px solid ${testResult.success ? '#2e7d32' : '#d32f2f'}`,
                            color: testResult.success ? '#81c784' : '#ff8a80',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5em'
                        }}>
                            <span className='material-icons' style={{ fontSize: '1.2em' }}>
                                {testResult.success ? 'check_circle' : 'error'}
                            </span>
                            <span>{testResult.message}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.8em', marginTop: '0.2em' }}>
                        <button
                            type='submit'
                            className='seerFilterBtn active'
                        >
                            Save Endpoint
                        </button>
                        <button
                            type='button'
                            className='seerActionBtn'
                            onClick={handleTestConnection}
                            disabled={isTesting}
                        >
                            <span className='material-icons' style={{ fontSize: '1.1em' }}>
                                {isTesting ? 'rotate_right' : 'network_check'}
                            </span>
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Display & Backdrops Preference */}
            <div className='seerSettingsCard' style={{
                padding: '1.5em',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2em'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8em', flex: 1, minWidth: '240px' }}>
                        <span className='material-icons' style={{ color: 'var(--jf-palette-primary-main, #00a4dc)', fontSize: '1.8em' }}>
                            wallpaper
                        </span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '1.1em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                                Dynamic Fanart Backdrops
                            </div>
                            <div style={{ fontSize: '0.82em', color: 'var(--jf-palette-text-secondary, #aaa)', marginTop: '0.25em' }}>
                                Mimics Jellyfin&apos;s backdrop feature by displaying ambient fanart imagery behind the interface. Adapts seamlessly to installed themes (like Abyss).
                            </div>
                        </div>
                    </div>

                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6em', userSelect: 'none' }}>
                        <input
                            type='checkbox'
                            checked={enableBackdrops}
                            onChange={(e) => handleToggleBackdrops(e.target.checked)}
                            style={{
                                width: '1.4em',
                                height: '1.4em',
                                accentColor: 'var(--jf-palette-primary-main, #00a4dc)',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ fontSize: '0.9em', fontWeight: 500 }}>
                            {enableBackdrops ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </div>

                <div style={{ borderTop: '1px solid var(--jf-palette-divider, rgba(255,255,255,0.08))', paddingTop: '1.2em', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1em', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8em', flex: 1, minWidth: '240px' }}>
                        <span className='material-icons' style={{ color: 'var(--jf-palette-primary-main, #00a4dc)', fontSize: '1.8em' }}>
                            blur_on
                        </span>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '1.1em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                                Frosted Glass UI (Abyss Style)
                            </div>
                            <div style={{ fontSize: '0.82em', color: 'var(--jf-palette-text-secondary, #aaa)', marginTop: '0.25em' }}>
                                Replaces solid gray menus, buttons, cards, and modal dialogs with translucent frosted glass and smooth blurs.
                            </div>
                        </div>
                    </div>

                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6em', userSelect: 'none' }}>
                        <input
                            type='checkbox'
                            checked={enableGlassTheme}
                            onChange={(e) => handleToggleGlassTheme(e.target.checked)}
                            style={{
                                width: '1.4em',
                                height: '1.4em',
                                accentColor: 'var(--jf-palette-primary-main, #00a4dc)',
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ fontSize: '0.9em', fontWeight: 500 }}>
                            {enableGlassTheme ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </div>
            </div>

            {/* Delegated Permissions Breakdown (Read-Only) */}
            <div className='seerSettingsCard' style={{ padding: '1.5em' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', marginBottom: '0.5em' }}>
                    <span className='material-icons' style={{ color: 'var(--jf-palette-primary-main, #00a4dc)', fontSize: '1.5em' }}>verified_user</span>
                    <h2 style={{ margin: 0, fontSize: '1.3em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                        Permissions Delegated by Seer Server
                    </h2>
                </div>
                <p style={{ margin: '0 0 1.2em 0', fontSize: '0.88em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    Permissions are managed directly on your Seer administrator console. This client automatically adapts to the permissions delegated to your account below:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.6em 0.8em', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span className='material-icons' style={{ color: checkPermissionFlag(SeerPermission.REQUEST) ? '#4caf50' : '#888', fontSize: '20px' }}>
                            {checkPermissionFlag(SeerPermission.REQUEST) ? 'check_circle' : 'cancel'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9em' }}>Submit Media Requests</div>
                            <div style={{ fontSize: '0.78em', color: 'var(--jf-palette-text-secondary, #888)' }}>Request movies and TV series</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.6em 0.8em', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span className='material-icons' style={{ color: checkPermissionFlag(SeerPermission.AUTO_APPROVE) ? '#4caf50' : '#888', fontSize: '20px' }}>
                            {checkPermissionFlag(SeerPermission.AUTO_APPROVE) ? 'check_circle' : 'cancel'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9em' }}>Auto-Approve Requests</div>
                            <div style={{ fontSize: '0.78em', color: 'var(--jf-palette-text-secondary, #888)' }}>Bypass moderator approval</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.6em 0.8em', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span className='material-icons' style={{ color: checkPermissionFlag(SeerPermission.REQUEST_4K) ? '#4caf50' : '#888', fontSize: '20px' }}>
                            {checkPermissionFlag(SeerPermission.REQUEST_4K) ? 'check_circle' : 'cancel'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9em' }}>4K Ultra-HD Requests</div>
                            <div style={{ fontSize: '0.78em', color: 'var(--jf-palette-text-secondary, #888)' }}>Request high-resolution 4K streams</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.6em 0.8em', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span className='material-icons' style={{ color: checkPermissionFlag(SeerPermission.REQUEST_ADVANCED) ? '#4caf50' : '#888', fontSize: '20px' }}>
                            {checkPermissionFlag(SeerPermission.REQUEST_ADVANCED) ? 'check_circle' : 'cancel'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9em' }}>Advanced Delegation</div>
                            <div style={{ fontSize: '0.78em', color: 'var(--jf-palette-text-secondary, #888)' }}>Select storage location & quality profile</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.6em 0.8em', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span className='material-icons' style={{ color: checkPermissionFlag(SeerPermission.MANAGE_REQUESTS) ? '#4caf50' : '#888', fontSize: '20px' }}>
                            {checkPermissionFlag(SeerPermission.MANAGE_REQUESTS) ? 'check_circle' : 'cancel'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9em' }}>Manage & Approve Requests</div>
                            <div style={{ fontSize: '0.78em', color: 'var(--jf-palette-text-secondary, #888)' }}>Approve or decline user requests</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.6em 0.8em', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                        <span className='material-icons' style={{ color: checkPermissionFlag(SeerPermission.ADMIN) ? '#4caf50' : '#888', fontSize: '20px' }}>
                            {checkPermissionFlag(SeerPermission.ADMIN) ? 'check_circle' : 'cancel'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9em' }}>Administrator</div>
                            <div style={{ fontSize: '0.78em', color: 'var(--jf-palette-text-secondary, #888)' }}>Full server access</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
