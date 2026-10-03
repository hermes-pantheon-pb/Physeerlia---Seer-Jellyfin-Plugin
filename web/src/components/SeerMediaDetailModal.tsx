import React, { FC, useState, useEffect } from 'react';
import { SeerMediaItem, MediaStatus } from '../types';
import { seerApi } from '../services/seerApi';

interface SeerMediaDetailModalProps {
    item: SeerMediaItem;
    onClose: () => void;
    onRequestClick: (item: SeerMediaItem) => void;
    onBackdropChange?: (url: string) => void;
    isGlassTheme?: boolean;
}

export const SeerMediaDetailModal: FC<SeerMediaDetailModalProps> = ({ item, onClose, onRequestClick, onBackdropChange, isGlassTheme }) => {
    const [detailItem, setDetailItem] = useState<SeerMediaItem>(item);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

    useEffect(() => {
        let isCancelled = false;
        setDetailItem(item);

        if (item.backdropPath) {
            onBackdropChange?.(item.backdropPath);
        }

        if (item.mediaType === 'tv' && (!item.seasons || item.seasons.length === 0)) {
            setIsLoadingDetails(true);
            seerApi.getMediaDetails('tv', item.id).then(fullItem => {
                if (!isCancelled && fullItem) {
                    setDetailItem(fullItem);
                    if (fullItem.backdropPath && fullItem.backdropPath !== item.backdropPath) {
                        onBackdropChange?.(fullItem.backdropPath);
                    }
                }
            }).catch(err => {
                console.warn('Failed to load series details in modal', err);
            }).finally(() => {
                if (!isCancelled) {
                    setIsLoadingDetails(false);
                }
            });
        }

        return () => {
            isCancelled = true;
        };
    }, [item, onBackdropChange]);

    const activeItem = detailItem || item;
    const year = activeItem.releaseDate ? new Date(activeItem.releaseDate).getFullYear() : '';
    const status = activeItem.mediaInfo?.status;


    return (
        <div className={`seerModalBackdrop ${isGlassTheme ? 'seerGlassTheme' : ''}`} onClick={onClose}>
            <div className='seerModalContent' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
                <div className='seerModalHeader'>
                    <h2>{activeItem.title}</h2>
                    <button className='closeButton' onClick={onClose} aria-label='Close'>&times;</button>
                </div>

                <div className='seerModalBody'>
                    <div style={{ display: 'flex', gap: '1.5em', flexWrap: 'wrap' }}>
                        {activeItem.posterPath && (
                            <img
                                src={activeItem.posterPath}
                                alt={activeItem.title}
                                style={{
                                    width: '180px',
                                    height: '270px',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--jf-card-borderRadius, 0.3em)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                                }}
                            />
                        )}
                        <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '0.6em' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8em', flexWrap: 'wrap' }}>
                                <span style={{ padding: '0.2em 0.6em', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', fontSize: '0.85em', fontWeight: 600 }}>
                                    {activeItem.mediaType === 'tv' ? 'TV Series' : 'Movie'}
                                </span>
                                {year && <span style={{ color: 'var(--jf-palette-text-secondary, #aaa)', fontSize: '0.9em' }}>{year}</span>}
                                {activeItem.voteAverage ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b', fontSize: '0.9em' }}>
                                        <span className='material-icons' style={{ fontSize: '15px' }}>star</span>
                                        {activeItem.voteAverage.toFixed(1)} / 10
                                    </span>
                                ) : null}
                            </div>

                            {activeItem.genres?.length ? (
                                <div style={{ fontSize: '0.85em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                    {activeItem.genres.join(' • ')}
                                </div>
                            ) : null}

                            <div style={{ marginTop: '0.5em', fontSize: '0.92em', lineHeight: 1.5, color: 'var(--jf-palette-text-primary, #ddd)' }}>
                                {activeItem.overview || 'No description available.'}
                            </div>

                            {/* Status info */}
                            <div style={{ marginTop: 'auto', paddingTop: '1em', display: 'flex', alignItems: 'center', gap: '0.8em' }}>
                                {status === MediaStatus.AVAILABLE ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em', color: '#4caf50', fontWeight: 600, fontSize: '0.9em' }}>
                                        <span className='material-icons'>check_circle</span>
                                        Available in Jellyfin Library
                                    </div>
                                ) : status === MediaStatus.PROCESSING ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em', color: '#03a9f4', fontWeight: 600, fontSize: '0.9em' }}>
                                        <span className='material-icons'>downloading</span>
                                        Currently Processing / Downloading
                                    </div>
                                ) : status === MediaStatus.PENDING ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4em', color: '#ff9800', fontWeight: 600, fontSize: '0.9em' }}>
                                        <span className='material-icons'>schedule</span>
                                        Requested — Pending Approval
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Seasons preview for TV */}
                    {activeItem.mediaType === 'tv' && (
                        <div style={{ marginTop: '1.2em' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5em' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                    Seasons & Series Overview {activeItem.seasons ? `(${activeItem.seasons.length} Seasons)` : ''}
                                </h4>
                                {isLoadingDetails && (
                                    <span style={{ fontSize: '0.8em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                                        Loading seasons...
                                    </span>
                                )}
                            </div>

                            {activeItem.seasons && activeItem.seasons.length > 0 ? (
                                <div style={{ display: 'flex', gap: '0.6em', overflowX: 'auto', paddingBottom: '0.5em' }}>
                                    {activeItem.seasons.map(s => (
                                        <div
                                            key={s.id}
                                            className='seerSeasonPreviewCard'
                                            style={{
                                                padding: '0.6em 0.8em',
                                                backgroundColor: 'var(--jf-palette-background-default, rgba(0,0,0,0.3))',
                                                borderRadius: 'var(--jf-card-borderRadius, 0.25em)',
                                                border: '1px solid var(--jf-palette-divider, rgba(255,255,255,0.08))',
                                                minWidth: '110px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: '0.9em' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.8em', color: 'var(--jf-palette-text-secondary, #888)' }}>
                                                {s.episodeCount} eps
                                            </div>
                                            {s.status === MediaStatus.AVAILABLE && (
                                                <div style={{ fontSize: '0.7em', color: '#4caf50', marginTop: '0.2em' }}>Available</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : !isLoadingDetails ? (
                                <div style={{ fontSize: '0.85em', color: 'var(--jf-palette-text-secondary, #888)' }}>
                                    No season breakdown available.
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className='seerModalFooter'>
                    <button type='button' className='cancelBtn' onClick={onClose}>
                        Close
                    </button>
                    <button
                        type='button'
                        className='submitBtn'
                        onClick={() => {
                            onClose();
                            onRequestClick(activeItem);
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4em' }}>
                            <span className='material-icons' style={{ fontSize: '1.1em' }}>add_circle</span>
                            {status === MediaStatus.AVAILABLE ? 'Request Additional Quality / 4K' : 'Request Media'}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};
