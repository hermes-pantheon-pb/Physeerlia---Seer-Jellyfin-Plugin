import React, { FC, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    SeerMediaItem,
    SeerServer,
    SeerProfile,
    SeerRootFolder,
    SeerSeason,
    MediaStatus,
    CreateRequestPayload
} from '../types';
import { seerApi } from '../services/seerApi';
import {
    canRequest,
    canAutoApprove,
    canRequestAdvanced,
    hasPermission,
    SeerPermission
} from '../seerPermissions';

interface SeerRequestModalProps {
    item: SeerMediaItem;
    onClose: () => void;
    onBack?: () => void;
    onRequestSuccess: () => void;
    isGlassTheme?: boolean;
}

type SeasonSelectionMode = 'all' | 'first' | 'latest' | 'custom';

export const SeerRequestModal: FC<SeerRequestModalProps> = ({ item, onClose, onBack, onRequestSuccess, isGlassTheme }) => {
    const currentUser = seerApi.getCurrentUser();
    const permissions = currentUser?.permissions || 0;

    const userCanRequest = canRequest(permissions);
    const userCanRequest4k = canRequest(permissions, true);
    const userCanRequestAdvanced = canRequestAdvanced(permissions);
    const willAutoApprove = canAutoApprove(permissions);

    // Form states
    const [is4k, setIs4k] = useState(false);
    const [allServers, setAllServers] = useState<SeerServer[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<number | undefined>(undefined);
    const [profiles, setProfiles] = useState<SeerProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | undefined>(undefined);
    const [rootFolders, setRootFolders] = useState<SeerRootFolder[]>([]);
    const [selectedRootFolder, setSelectedRootFolder] = useState<string>('');
    const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);

    // TV Season states
    const isTv = item.mediaType === 'tv';
    const [seasons, setSeasons] = useState<SeerSeason[]>(item.seasons || []);
    const [isLoadingSeasons, setIsLoadingSeasons] = useState<boolean>(
        isTv && (!item.seasons || item.seasons.length === 0)
    );
    const [seasonMode, setSeasonMode] = useState<SeasonSelectionMode>('all');
    const [selectedSeasonNumbers, setSelectedSeasonNumbers] = useState<number[]>([]);
    const [expandedSeasonNumber, setExpandedSeasonNumber] = useState<number | null>(null);
    const [loadingEpisodesSeason, setLoadingEpisodesSeason] = useState<number | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    // 1. Initial load of available servers for this media type
    useEffect(() => {
        const loadServers = async () => {
            const serverList = await seerApi.getServers(item.mediaType);
            setAllServers(serverList);

            const matching = serverList.filter(s => s.is4k === is4k);
            const candidates = matching.length > 0 ? matching : serverList;
            const defaultServer = candidates.find(s => s.isDefault) || candidates[0];

            if (defaultServer) {
                setSelectedServerId(defaultServer.id);
            }
        };

        void loadServers();
    }, [item.mediaType]);

    // 2. Load complete TV seasons breakdown from server if not already present
    useEffect(() => {
        if (!isTv) return;

        let isCancelled = false;

        const initSeasons = (seasonItems: SeerSeason[]) => {
            setSeasons(seasonItems);
            // Default select regular seasons (seasonNumber > 0)
            const regular = seasonItems.filter(s => s.seasonNumber > 0);
            const targets = regular.length > 0 ? regular : seasonItems;
            setSelectedSeasonNumbers(targets.map(s => s.seasonNumber));
        };

        if (item.seasons && item.seasons.length > 0) {
            initSeasons(item.seasons);
        } else {
            setIsLoadingSeasons(true);
        }

        // Query getMediaDetails to get full season list from Seer
        seerApi.getMediaDetails('tv', item.id).then(details => {
            if (isCancelled) return;
            if (details?.seasons && details.seasons.length > 0) {
                initSeasons(details.seasons);
            }
        }).catch(err => {
            console.error('Failed to load series season breakdown', err);
        }).finally(() => {
            if (!isCancelled) {
                setIsLoadingSeasons(false);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, [isTv, item.id, item.seasons]);


    // 2. Fetch live profiles and root folders whenever the selected server changes
    useEffect(() => {
        if (selectedServerId === undefined) return;

        let isCancelled = false;
        const loadServerDetails = async () => {
            setIsLoadingOptions(true);
            const currentServer = allServers.find(s => s.id === selectedServerId);

            try {
                const details = await seerApi.getServerDetails(item.mediaType, selectedServerId);
                if (isCancelled) return;

                // Configure quality profiles with fallback
                if (details.profiles.length > 0) {
                    setProfiles(details.profiles);
                    const hasCurrent = details.profiles.some(p => p.id === selectedProfileId);
                    if (!hasCurrent) {
                        const defaultProf = currentServer?.activeProfileId && details.profiles.some(p => p.id === currentServer.activeProfileId)
                            ? currentServer.activeProfileId
                            : details.profiles[0].id;
                        setSelectedProfileId(defaultProf);
                    }
                } else if (currentServer?.activeProfileId !== undefined) {
                    const fallbackProfile: SeerProfile = {
                        id: currentServer.activeProfileId,
                        name: currentServer.activeProfileName || `Default Profile (${currentServer.activeProfileId})`
                    };
                    setProfiles([fallbackProfile]);
                    setSelectedProfileId(fallbackProfile.id);
                } else {
                    setProfiles([]);
                }

                // Configure root storage directories with fallback
                if (details.rootFolders.length > 0) {
                    setRootFolders(details.rootFolders);
                    const hasCurrent = details.rootFolders.some(rf => rf.path === selectedRootFolder);
                    if (!hasCurrent) {
                        const defaultFolder = currentServer?.activeDirectory && details.rootFolders.some(rf => rf.path === currentServer.activeDirectory)
                            ? currentServer.activeDirectory
                            : details.rootFolders[0].path;
                        setSelectedRootFolder(defaultFolder);
                    }
                } else if (currentServer?.activeDirectory) {
                    const fallbackFolder: SeerRootFolder = {
                        id: 1,
                        name: currentServer.activeDirectory,
                        path: currentServer.activeDirectory
                    };
                    setRootFolders([fallbackFolder]);
                    setSelectedRootFolder(fallbackFolder.path);
                } else {
                    setRootFolders([]);
                }
            } catch (err) {
                console.error('Failed to load server options', err);
            } finally {
                if (!isCancelled) {
                    setIsLoadingOptions(false);
                }
            }
        };

        void loadServerDetails();

        return () => {
            isCancelled = true;
        };
    }, [selectedServerId, item.mediaType, allServers]);

    // Handle 4K toggle and automatically switch to appropriate server if one exists
    const handleToggle4k = (newIs4k: boolean) => {
        setIs4k(newIs4k);
        const matching = allServers.filter(s => s.is4k === newIs4k);
        const target = (matching.find(s => s.isDefault) || matching[0]) || allServers[0];
        if (target) {
            setSelectedServerId(target.id);
        }
    };


    // Handle Season Selection Mode Change
    const handleSeasonModeChange = (mode: SeasonSelectionMode) => {
        setSeasonMode(mode);
        const regularSeasons = seasons.filter(s => s.seasonNumber > 0);
        const allAvailable = regularSeasons.length > 0 ? regularSeasons : seasons;

        if (mode === 'all') {
            setSelectedSeasonNumbers(seasons.map(s => s.seasonNumber));
        } else if (mode === 'first') {
            const first = allAvailable[0];
            setSelectedSeasonNumbers(first ? [first.seasonNumber] : [1]);
        } else if (mode === 'latest') {
            const latest = allAvailable[allAvailable.length - 1];
            setSelectedSeasonNumbers(latest ? [latest.seasonNumber] : [1]);
        }
    };

    const toggleSeasonCheckbox = (seasonNum: number) => {
        if (selectedSeasonNumbers.includes(seasonNum)) {
            setSelectedSeasonNumbers(selectedSeasonNumbers.filter(n => n !== seasonNum));
        } else {
            setSelectedSeasonNumbers([...selectedSeasonNumbers, seasonNum].sort((a, b) => a - b));
        }
    };

    const handleSelectAllSeasons = () => {
        setSelectedSeasonNumbers(seasons.map(s => s.seasonNumber));
    };

    const handleDeselectAllSeasons = () => {
        setSelectedSeasonNumbers([]);
    };

    const handleToggleExpandSeason = async (seasonNumber: number) => {
        if (expandedSeasonNumber === seasonNumber) {
            setExpandedSeasonNumber(null);
            return;
        }
        setExpandedSeasonNumber(seasonNumber);
        const targetSeason = seasons.find(s => s.seasonNumber === seasonNumber);
        if (targetSeason && (!targetSeason.episodes || targetSeason.episodes.length === 0) && targetSeason.episodeCount > 0) {
            setLoadingEpisodesSeason(seasonNumber);
            try {
                const eps = await seerApi.getSeasonDetails(item.id, seasonNumber);
                if (eps && eps.length > 0) {
                    setSeasons(prev => prev.map(s => s.seasonNumber === seasonNumber ? { ...s, episodes: eps } : s));
                }
            } catch (err) {
                console.warn('Failed to load season episodes', err);
            } finally {
                setLoadingEpisodesSeason(null);
            }
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!userCanRequest) {
            setErrorMsg('You do not have permission to submit requests on this server.');
            return;
        }

        if (isTv && seasonMode === 'custom' && selectedSeasonNumbers.length === 0) {
            setErrorMsg('Please select at least one season to request.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: CreateRequestPayload = {
                mediaType: item.mediaType,
                mediaId: item.id,
                is4k,
                ...(userCanRequestAdvanced && {
                    serverId: selectedServerId,
                    profileId: selectedProfileId,
                    rootFolder: selectedRootFolder
                }),
                ...(isTv && {
                    seasons: seasonMode === 'all' ? 'all' : selectedSeasonNumbers
                })
            };

            await seerApi.createRequest(payload);
            setIsSubmitting(false);
            onRequestSuccess();
            onClose();
        } catch (err: unknown) {
            setIsSubmitting(false);
            setErrorMsg(err instanceof Error ? err.message : 'Failed to submit request');
        }
    };

    return (
        <div className={`seerModalContent ${isGlassTheme ? 'seerGlassTheme' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className='seerModalHeader'>
                    <h2>Request {item.mediaType === 'tv' ? 'Series' : 'Movie'}</h2>
                    <button className='closeButton' onClick={onClose} aria-label='Close'>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='seerModalBody'>
                        {/* Media Summary */}
                        <div className='seerMediaSummary'>
                            {item.posterPath && (
                                <img className='modalPoster' src={item.posterPath} alt={item.title} />
                            )}
                            <div>
                                <h3 style={{ margin: '0 0 0.3em 0', fontSize: '1.2em' }}>{item.title}</h3>
                                <div style={{ fontSize: '0.85em', color: 'var(--jf-palette-text-secondary, #aaa)', marginBottom: '0.6em' }}>
                                    {item.releaseDate ? new Date(item.releaseDate).getFullYear() : ''}
                                    {item.genres?.length ? ` • ${item.genres.join(', ')}` : ''}
                                </div>
                                <div className='modalOverview'>{item.overview}</div>
                            </div>
                        </div>

                        {errorMsg && (
                            <div style={{ padding: '0.7em 1em', backgroundColor: 'rgba(211, 47, 47, 0.2)', border: '1px solid #d32f2f', borderRadius: '4px', color: '#ff8a80', fontSize: '0.9em' }}>
                                {errorMsg}
                            </div>
                        )}

                        {/* Permission Warning if cannot request */}
                        {!userCanRequest && (
                            <div style={{ padding: '0.75em 1em', backgroundColor: 'rgba(237, 108, 2, 0.2)', border: '1px solid #ed6c02', borderRadius: '4px', color: '#ffb74d', fontSize: '0.9em' }}>
                                Your user role does not possess the <strong>REQUEST</strong> permission. Please contact your server administrator to grant delegation privileges.
                            </div>
                        )}

                        {/* 4K Request Option (Shown only if permitted) */}
                        {userCanRequest4k && (
                            <div className='seerToggleGroup'>
                                <div>
                                    <div className='toggleLabel'>Request in 4K Ultra-HD</div>
                                    <div className='toggleDesc'>Source high-bitrate 4K HDR stream directly into the 4K library</div>
                                </div>
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type='checkbox'
                                        checked={is4k}
                                        onChange={(e) => handleToggle4k(e.target.checked)}
                                        style={{ width: '1.3em', height: '1.3em', accentColor: 'var(--jf-palette-primary-main, #00a4dc)' }}
                                    />
                                </label>
                            </div>
                        )}

                        {/* TV Series Season & Episode Selection */}
                        {isTv && (
                            <div className='seerFormGroup'>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4em' }}>
                                    <label style={{ margin: 0 }}>Seasons & Episodes Delegation</label>
                                    {isLoadingSeasons && (
                                        <span style={{ fontSize: '0.8em', color: 'var(--jf-palette-text-secondary, #aaa)', display: 'flex', alignItems: 'center', gap: '0.4em' }}>
                                            <span className='material-icons' style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }}>rotate_right</span>
                                            Fetching season data...
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6em', marginBottom: '0.8em' }}>
                                    <button
                                        type='button'
                                        className={`seerFilterBtn ${seasonMode === 'all' ? 'active' : ''}`}
                                        onClick={() => handleSeasonModeChange('all')}
                                        disabled={isLoadingSeasons}
                                    >
                                        All Seasons ({seasons.length})
                                    </button>
                                    <button
                                        type='button'
                                        className={`seerFilterBtn ${seasonMode === 'first' ? 'active' : ''}`}
                                        onClick={() => handleSeasonModeChange('first')}
                                        disabled={isLoadingSeasons || seasons.length === 0}
                                    >
                                        First Season
                                    </button>
                                    <button
                                        type='button'
                                        className={`seerFilterBtn ${seasonMode === 'latest' ? 'active' : ''}`}
                                        onClick={() => handleSeasonModeChange('latest')}
                                        disabled={isLoadingSeasons || seasons.length === 0}
                                    >
                                        Latest Season
                                    </button>
                                    <button
                                        type='button'
                                        className={`seerFilterBtn ${seasonMode === 'custom' ? 'active' : ''}`}
                                        onClick={() => handleSeasonModeChange('custom')}
                                        disabled={isLoadingSeasons || seasons.length === 0}
                                    >
                                        Specific Seasons ({selectedSeasonNumbers.length}/{seasons.length})
                                    </button>
                                </div>

                                {isLoadingSeasons && seasonMode === 'custom' && (
                                    <div style={{ padding: '1.2em', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px dashed var(--jf-palette-divider, rgba(255,255,255,0.1))' }}>
                                        <span className='material-icons' style={{ animation: 'spin 1s linear infinite', fontSize: '1.6em', color: 'var(--jf-palette-primary-main, #00a4dc)' }}>rotate_right</span>
                                        <div style={{ marginTop: '0.4em', fontSize: '0.85em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                            Loading complete season list and episodes from server...
                                        </div>
                                    </div>
                                )}

                                {!isLoadingSeasons && seasonMode === 'custom' && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3em 0.2em', marginBottom: '0.4em', fontSize: '0.82em' }}>
                                            <span style={{ color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                                {selectedSeasonNumbers.length} of {seasons.length} seasons selected
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.6em', alignItems: 'center' }}>
                                                <button
                                                    type='button'
                                                    className='seerTextBtn'
                                                    onClick={handleSelectAllSeasons}
                                                >
                                                    Select All
                                                </button>
                                                <span style={{ color: 'var(--jf-palette-divider, rgba(255,255,255,0.2))' }}>•</span>
                                                <button
                                                    type='button'
                                                    className='seerTextBtn muted'
                                                    onClick={handleDeselectAllSeasons}
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                        </div>

                                        <div className='seerSeasonsList' style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                            {seasons.map(s => {
                                                const isChecked = selectedSeasonNumbers.includes(s.seasonNumber);
                                                const isAvailable = s.status === MediaStatus.AVAILABLE;
                                                const isExpanded = expandedSeasonNumber === s.seasonNumber;
                                                const hasEpisodes = (Array.isArray(s.episodes) && s.episodes.length > 0) || s.episodeCount > 0;
                                                const isLoadingThisSeasonEps = loadingEpisodesSeason === s.seasonNumber;

                                                return (
                                                    <div
                                                        key={s.id || s.seasonNumber}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            borderBottom: '1px solid var(--jf-palette-divider, rgba(255,255,255,0.06))',
                                                            padding: '0.45em 0.3em'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em' }}>
                                                            <input
                                                                type='checkbox'
                                                                checked={isChecked}
                                                                disabled={isAvailable}
                                                                onChange={() => toggleSeasonCheckbox(s.seasonNumber)}
                                                                style={{ width: '1.2em', height: '1.2em', accentColor: 'var(--jf-palette-primary-main, #00a4dc)', cursor: isAvailable ? 'not-allowed' : 'pointer' }}
                                                            />
                                                            <span
                                                                style={{ fontWeight: 600, fontSize: '0.92em', cursor: isAvailable ? 'default' : 'pointer' }}
                                                                onClick={() => !isAvailable && toggleSeasonCheckbox(s.seasonNumber)}
                                                            >
                                                                {s.name}
                                                            </span>
                                                            {isAvailable ? (
                                                                <span style={{ fontSize: '0.78em', color: '#4caf50', padding: '0.1em 0.5em', backgroundColor: 'rgba(76, 175, 80, 0.15)', borderRadius: '3px', marginLeft: 'auto' }}>
                                                                    Available in Library
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '0.8em', color: 'var(--jf-palette-text-secondary, #888)', marginLeft: 'auto' }}>
                                                                    {s.episodeCount} Episodes
                                                                </span>
                                                            )}

                                                            {hasEpisodes && (
                                                                <button
                                                                    type='button'
                                                                    className='seerIconButton'
                                                                    onClick={() => handleToggleExpandSeason(s.seasonNumber)}
                                                                    title={isExpanded ? 'Hide episode list' : 'View episode list'}
                                                                >
                                                                    <span
                                                                        className='material-icons'
                                                                        style={{
                                                                            fontSize: '18px',
                                                                            animation: isLoadingThisSeasonEps ? 'spin 1s linear infinite' : 'none'
                                                                        }}
                                                                    >
                                                                        {isLoadingThisSeasonEps ? 'rotate_right' : (isExpanded ? 'expand_less' : 'expand_more')}
                                                                    </span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Episode details expandable */}
                                                        {isExpanded && (
                                                            <div style={{
                                                                margin: '0.4em 0 0.2em 1.8em',
                                                                padding: '0.4em 0.8em',
                                                                backgroundColor: 'var(--jf-palette-background-default, rgba(0,0,0,0.25))',
                                                                borderRadius: '3px',
                                                                fontSize: '0.82em',
                                                                maxHeight: '140px',
                                                                overflowY: 'auto'
                                                            }}>
                                                                {isLoadingThisSeasonEps ? (
                                                                    <div style={{ padding: '0.5em', textAlign: 'center', color: 'var(--jf-palette-text-secondary, #888)' }}>
                                                                        Loading episodes from Seer...
                                                                    </div>
                                                                ) : Array.isArray(s.episodes) && s.episodes.length > 0 ? (
                                                                    s.episodes.map(ep => (
                                                                        <div key={ep.id || ep.episodeNumber} style={{ padding: '0.25em 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                            <span>{ep.episodeNumber}. {ep.name}</span>
                                                                            {ep.airDate && (
                                                                                <span style={{ color: 'var(--jf-palette-text-secondary, #888)', fontSize: '0.9em' }}>
                                                                                    {new Date(ep.airDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div style={{ padding: '0.5em', color: 'var(--jf-palette-text-secondary, #888)' }}>
                                                                        No episode information available.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* Advanced Settings Delegation (Displayed only if user has REQUEST_ADVANCED or ADMIN) */}
                        {userCanRequestAdvanced && (
                            <div style={{ marginTop: '0.5em', padding: '1em', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--jf-palette-divider, rgba(255,255,255,0.08))', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginBottom: '0.8em' }}>
                                    <span className='material-icons' style={{ fontSize: '1.2em', color: 'var(--jf-palette-primary-main, #00a4dc)' }}>tune</span>
                                    <strong style={{ fontSize: '0.95em' }}>Advanced Delegation Settings</strong>
                                    <span style={{ fontSize: '0.75em', padding: '0.15em 0.5em', backgroundColor: 'rgba(0, 164, 220, 0.2)', color: 'var(--jf-palette-primary-main, #00a4dc)', borderRadius: '3px', marginLeft: 'auto' }}>
                                        Power User
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9em' }}>
                                    {/* Destination Server */}
                                    <div className='seerFormGroup'>
                                        <label>Destination Service / Server</label>
                                        <select
                                            value={selectedServerId !== undefined ? selectedServerId : ''}
                                            onChange={(e) => setSelectedServerId(Number(e.target.value))}
                                            disabled={isLoadingOptions || allServers.length === 0}
                                        >
                                            {allServers.length === 0 ? (
                                                <option value=''>Loading servers...</option>
                                            ) : (
                                                allServers.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} {s.is4k ? '(4K)' : ''} {s.isDefault ? '(Default)' : ''}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    {/* Root Folder Location */}
                                    <div className='seerFormGroup'>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <label>Root Folder Storage Location</label>
                                            {isLoadingOptions && (
                                                <span style={{ fontSize: '0.75em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                                    Loading storage options...
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={selectedRootFolder}
                                            onChange={(e) => setSelectedRootFolder(e.target.value)}
                                            disabled={isLoadingOptions || rootFolders.length === 0}
                                        >
                                            {isLoadingOptions && rootFolders.length === 0 ? (
                                                <option value=''>Loading storage options...</option>
                                            ) : rootFolders.length === 0 ? (
                                                <option value=''>No root folders available</option>
                                            ) : (
                                                rootFolders.map(rf => (
                                                    <option key={rf.id} value={rf.path}>
                                                        {rf.name && rf.name !== rf.path ? `${rf.name} (${rf.path})` : rf.path} {rf.freeSpace ? `— ${rf.freeSpace}` : ''}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <span className='helperText'>Target directory where downloaded files will be stored</span>
                                    </div>

                                    {/* Quality Profile */}
                                    <div className='seerFormGroup'>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <label>Transcoding & Quality Profile</label>
                                            {isLoadingOptions && (
                                                <span style={{ fontSize: '0.75em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                                    Loading profiles...
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={selectedProfileId !== undefined ? selectedProfileId : ''}
                                            onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                                            disabled={isLoadingOptions || profiles.length === 0}
                                        >
                                            {isLoadingOptions && profiles.length === 0 ? (
                                                <option value=''>Loading profiles...</option>
                                            ) : profiles.length === 0 ? (
                                                <option value=''>No quality profiles available</option>
                                            ) : (
                                                profiles.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Non-advanced users notice */}
                        {!userCanRequestAdvanced && (
                            <div style={{ fontSize: '0.8em', color: 'var(--jf-palette-text-secondary, #888)', fontStyle: 'italic' }}>
                                Note: Destination root folder and quality profile will be automatically managed according to default server rules.
                            </div>
                        )}

                        {/* Approval workflow status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em', fontSize: '0.85em', color: willAutoApprove ? '#81c784' : '#ffb74d' }}>
                            <span className='material-icons' style={{ fontSize: '1.2em' }}>
                                {willAutoApprove ? 'verified' : 'hourglass_top'}
                            </span>
                            <span>
                                {willAutoApprove
                                    ? 'Instant Request: This request will be automatically approved.'
                                    : 'Review Required: This request will be forwarded to server moderators for approval.'}
                            </span>
                        </div>
                    </div>

                    <div className='seerModalFooter'>
                        {onBack && (
                            <button
                                type='button'
                                className='cancelBtn'
                                onClick={onBack}
                                disabled={isSubmitting}
                                style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3em' }}
                            >
                                <span className='material-icons' style={{ fontSize: '18px' }}>arrow_back</span>
                                Back
                            </button>
                        )}
                        <button type='button' className='cancelBtn' onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button
                            type='submit'
                            className='submitBtn'
                            disabled={!userCanRequest || isSubmitting}
                        >
                            {isSubmitting ? 'Submitting Request...' : (willAutoApprove ? 'Request & Approve' : 'Submit Request')}
                        </button>
                    </div>
                </form>
            </div>
    );
};
