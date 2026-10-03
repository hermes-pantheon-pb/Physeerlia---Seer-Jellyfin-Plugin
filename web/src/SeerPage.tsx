import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { SeerMediaItem } from './types';
import { SeerDiscovery } from './components/SeerDiscovery';
import { SeerSearch } from './components/SeerSearch';
import { SeerRequestsList } from './components/SeerRequestsList';
import { SeerSettings } from './components/SeerSettings';
import { SeerLogin } from './components/SeerLogin';
import { SeerMediaDetailModal } from './components/SeerMediaDetailModal';
import { SeerRequestModal } from './components/SeerRequestModal';
import { seerApi } from './services/seerApi';
import './styles/seer.scss';

interface PageProps {
    id?: string;
    title?: string;
    className?: string;
    children?: React.ReactNode;
}

const Page: FC<PageProps> = ({ id, className, children }) => (
    <div id={id} className={`page ${className || ''}`}>
        {children}
    </div>
);

class SeerBackdropManager {
    private container: HTMLElement | null = null;
    private currentImages: string[] = [];
    private currentIndex = -1;
    private intervalId: any = null;
    private currentActiveImg: HTMLElement | null = null;

    private getContainer(): HTMLElement {
        if (!this.container || !document.body.contains(this.container)) {
            let existing = document.getElementById('seerBackdropContainer');
            if (!existing) {
                existing = document.createElement('div');
                existing.id = 'seerBackdropContainer';
                existing.className = 'seerBackdropContainer';
                const seerRoot = document.getElementById('seerPluginRoot') || document.body;
                seerRoot.insertBefore(existing, seerRoot.firstChild);
            }
            this.container = existing;
        }
        return this.container;
    }

    public setBackdrop(url: string) {
        this.clearRotation();
        this.transitionTo(url);
    }

    public setBackdropImages(urls: string[]) {
        if (!urls || urls.length === 0) {
            this.clear();
            return;
        }
        this.currentImages = urls;
        this.currentIndex = 0;
        this.transitionTo(urls[0]);

        this.clearRotation();
        if (urls.length > 1) {
            this.intervalId = setInterval(() => {
                this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
                this.transitionTo(this.currentImages[this.currentIndex]);
            }, 8000);
        }
    }

    private transitionTo(url: string) {
        if (!url) return;
        const container = this.getContainer();
        const seerRoot = document.getElementById('seerPluginRoot');
        if (seerRoot) seerRoot.classList.add('withBackdrop');

        const img = new Image();
        img.onload = () => {
            const backdropEl = document.createElement('div');
            backdropEl.className = 'seerBackdropImage';
            backdropEl.style.backgroundImage = `url("${url}")`;
            container.appendChild(backdropEl);

            requestAnimationFrame(() => {
                backdropEl.classList.add('active');
            });

            const oldImg = this.currentActiveImg;
            this.currentActiveImg = backdropEl;
            if (oldImg) {
                setTimeout(() => {
                    if (oldImg.parentElement) oldImg.remove();
                }, 1000);
            }
        };
        img.src = url;
    }

    public clear() {
        this.clearRotation();
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.currentActiveImg = null;
        const seerRoot = document.getElementById('seerPluginRoot');
        if (seerRoot) seerRoot.classList.remove('withBackdrop');
    }

    private clearRotation() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

const seerBackdrops = new SeerBackdropManager();
const clearBackdrop = () => seerBackdrops.clear();
const setBackdrop = (url: string) => seerBackdrops.setBackdrop(url);
const setBackdropImages = (urls: string[]) => seerBackdrops.setBackdropImages(urls);

type ActiveTab = 'discovery' | 'search' | 'requests' | 'settings';

interface SeerPageProps {
    onClose?: () => void;
}

export const SeerPage: FC<SeerPageProps> = ({ onClose }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(seerApi.isAuthenticated());
    const [activeTab, setActiveTab] = useState<ActiveTab>('discovery');
    const [selectedMediaForDetail, setSelectedMediaForDetail] = useState<SeerMediaItem | null>(null);
    const [selectedMediaForRequest, setSelectedMediaForRequest] = useState<SeerMediaItem | null>(null);
    const [refreshRequestsKey, setRefreshRequestsKey] = useState<number>(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [backdropsEnabled, setBackdropsEnabled] = useState<boolean>(() => {
        const stored = localStorage.getItem('seer_enable_backdrops');
        return stored !== null ? stored === 'true' : true;
    });
    const [glassThemeEnabled, setGlassThemeEnabled] = useState<boolean>(() => {
        const stored = localStorage.getItem('seer_glass_theme');
        return stored !== null ? stored === 'true' : true;
    });
    const trendingBackdropsRef = useRef<string[]>([]);

    // Verify session on mount
    useEffect(() => {
        void seerApi.checkSession().then(user => {
            setIsAuthenticated(user !== null);
        });
    }, []);

    // Listen for backdrop preference changes from Settings tab
    useEffect(() => {
        const handleBackdropToggle = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>;
            const enabled = customEvent.detail?.enabled ?? true;
            setBackdropsEnabled(enabled);
            if (!enabled) {
                clearBackdrop();
            } else if (trendingBackdropsRef.current.length > 0) {
                setBackdropImages(trendingBackdropsRef.current);
            }
        };

        window.addEventListener('seer_backdrops_changed', handleBackdropToggle);
        return () => {
            window.removeEventListener('seer_backdrops_changed', handleBackdropToggle);
        };
    }, []);

    // Listen for frosted glass theme changes from Settings tab
    useEffect(() => {
        const handleGlassToggle = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>;
            setGlassThemeEnabled(customEvent.detail?.enabled ?? true);
        };

        window.addEventListener('seer_glass_theme_changed', handleGlassToggle);
        return () => {
            window.removeEventListener('seer_glass_theme_changed', handleGlassToggle);
        };
    }, []);

    // Cleanup backdrops when navigating away from Seer
    useEffect(() => {
        return () => {
            clearBackdrop();
        };
    }, []);

    const handleBackdropsLoaded = useCallback((urls: string[]) => {
        trendingBackdropsRef.current = urls;
        if (backdropsEnabled && urls.length > 0) {
            setBackdropImages(urls);
        }
    }, [backdropsEnabled]);

    const currentUser = seerApi.getCurrentUser();

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const handleMediaClick = (item: SeerMediaItem) => {
        setSelectedMediaForDetail(item);
        if (backdropsEnabled && item.backdropPath) {
            setBackdrop(item.backdropPath);
        }
    };

    const handleOpenRequestModal = (item: SeerMediaItem) => {
        setSelectedMediaForDetail(null);
        setSelectedMediaForRequest(item);
    };

    const handleRequestSuccess = () => {
        setRefreshRequestsKey(prev => prev + 1);
        showToast('Request submitted successfully! Tracking status in Requests tab.');
    };

    const handleSignOut = () => {
        setIsAuthenticated(false);
        showToast('Signed out of Seer session.');
    };

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        setActiveTab('discovery');
        showToast(`Welcome back, ${seerApi.getCurrentUser()?.username || 'User'}!`);
    };

    return (
        <Page
            id='seerPage'
            title='Requests & Discovery (Seer)'
            className={`mainAnimatedPage libraryPage allLibraryPage noSecondaryNavPage selfBackdropPage ${glassThemeEnabled ? 'seerGlassTheme' : ''}`}
        >
            <div className={`content-primary padded-left padded-right seerContainer ${glassThemeEnabled ? 'seerGlassTheme' : ''}`}>
                {/* Header bar */}
                <div className='seerHeaderBar'>
                    <div className='seerTitleSection'>
                        {onClose && (
                            <button
                                type='button'
                                onClick={onClose}
                                className='seerBackButton'
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: 'var(--jf-palette-text-primary, #fff)',
                                    borderRadius: '50%',
                                    width: '38px',
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    marginRight: '0.4em'
                                }}
                                title='Back to Jellyfin'
                            >
                                <span className='material-icons' style={{ fontSize: '20px' }}>arrow_back</span>
                            </button>
                        )}
                        <span className='material-icons seerIcon'>travel_explore</span>
                        <div>
                            <h1>Seer</h1>
                            <div className='seerSubtitle'>Media Discovery & Delegated Requests</div>
                        </div>
                    </div>

                    {isAuthenticated && currentUser ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8em', flexWrap: 'wrap' }}>
                            <div className='seerRoleBadge'>
                                <span className='roleDot' />
                                <span>Signed in as <strong>{currentUser.username || currentUser.email || 'User'}</strong></span>
                            </div>
                            <button
                                type='button'
                                className='seerSignOutBtn'
                                onClick={async () => {
                                    await seerApi.logout();
                                    handleSignOut();
                                }}
                                title='Sign Out of Seer'
                            >
                                <span className='material-icons' style={{ fontSize: '15px' }}>exit_to_app</span>
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className='seerRoleBadge'>
                            <span className='roleDot' style={{ backgroundColor: '#f59e0b' }} />
                            <span>Authentication Required</span>
                        </div>
                    )}
                </div>

                {/* Toast Notification */}
                {toastMessage && (
                    <div style={{
                        position: 'fixed',
                        bottom: '2em',
                        right: '2em',
                        backgroundColor: '#2e7d32',
                        color: '#fff',
                        padding: '0.8em 1.4em',
                        borderRadius: 'var(--jf-card-borderRadius, 0.3em)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6em',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        <span className='material-icons'>check_circle</span>
                        <span>{toastMessage}</span>
                    </div>
                )}

                {/* If Not Authenticated, show Login Form */}
                {!isAuthenticated ? (
                    <SeerLogin onLoginSuccess={handleLoginSuccess} />
                ) : (
                    <>
                        {/* Sub navigation tabs */}
                        <div className='seerTabs'>
                            <button
                                type='button'
                                className={`seerTabButton ${activeTab === 'discovery' ? 'active' : ''}`}
                                onClick={() => setActiveTab('discovery')}
                            >
                                <span className='material-icons' style={{ fontSize: '1.2em' }}>explore</span>
                                Discovery
                            </button>
                            <button
                                type='button'
                                className={`seerTabButton ${activeTab === 'search' ? 'active' : ''}`}
                                onClick={() => setActiveTab('search')}
                            >
                                <span className='material-icons' style={{ fontSize: '1.2em' }}>search</span>
                                Full Search
                            </button>
                            <button
                                type='button'
                                className={`seerTabButton ${activeTab === 'requests' ? 'active' : ''}`}
                                onClick={() => setActiveTab('requests')}
                            >
                                <span className='material-icons' style={{ fontSize: '1.2em' }}>inbox</span>
                                Requests
                            </button>
                            <button
                                type='button'
                                className={`seerTabButton ${activeTab === 'settings' ? 'active' : ''}`}
                                onClick={() => setActiveTab('settings')}
                            >
                                <span className='material-icons' style={{ fontSize: '1.2em' }}>tune</span>
                                Session & Permissions
                            </button>
                        </div>

                        {/* Tab Views */}
                        {activeTab === 'discovery' && (
                            <SeerDiscovery
                                onSelectMedia={handleMediaClick}
                                onBackdropsLoaded={handleBackdropsLoaded}
                            />
                        )}

                        {activeTab === 'search' && (
                            <SeerSearch onSelectMedia={handleMediaClick} />
                        )}

                        {activeTab === 'requests' && (
                            <SeerRequestsList refreshKey={refreshRequestsKey} />
                        )}

                        {activeTab === 'settings' && (
                            <SeerSettings
                                onRoleChanged={() => setRefreshRequestsKey(prev => prev + 1)}
                                onSignOut={handleSignOut}
                            />
                        )}
                    </>
                )}

                {/* Detail Modal */}
                {selectedMediaForDetail && (
                    <SeerMediaDetailModal
                        item={selectedMediaForDetail}
                        isGlassTheme={glassThemeEnabled}
                        onClose={() => {
                            setSelectedMediaForDetail(null);
                            if (backdropsEnabled && trendingBackdropsRef.current.length > 0) {
                                setBackdropImages(trendingBackdropsRef.current);
                            } else if (!backdropsEnabled) {
                                clearBackdrop();
                            }
                        }}
                        onRequestClick={handleOpenRequestModal}
                        onBackdropChange={(url) => {
                            if (backdropsEnabled && url) {
                                setBackdrop(url);
                            }
                        }}
                    />
                )}

                {/* Request Modal with Dynamic Permission Settings */}
                {selectedMediaForRequest && (
                    <SeerRequestModal
                        item={selectedMediaForRequest}
                        isGlassTheme={glassThemeEnabled}
                        onClose={() => setSelectedMediaForRequest(null)}
                        onRequestSuccess={handleRequestSuccess}
                    />
                )}
            </div>
        </Page>
    );
};

export default SeerPage;
