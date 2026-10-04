import React, { FC, useState, useEffect, useRef } from 'react';
import { SeerMediaItem, MediaStatus } from '../types';

interface SeerMediaCardProps {
    item: SeerMediaItem;
    onClick: (item: SeerMediaItem) => void;
}

const getStatusBadge = (item: SeerMediaItem) => {
    const status = item.mediaInfo?.status;
    const is4k = item.mediaInfo?.status4k === MediaStatus.AVAILABLE;

    if (status === MediaStatus.AVAILABLE) {
        return <span className='seerBadge statusAvailable'>Available</span>;
    }
    if (status === MediaStatus.PENDING) {
        return <span className='seerBadge statusPending'>Requested</span>;
    }
    if (status === MediaStatus.PROCESSING) {
        return <span className='seerBadge statusProcessing'>Processing</span>;
    }
    if (status === MediaStatus.PARTIALLY_AVAILABLE) {
        return <span className='seerBadge statusPartiallyAvailable'>Partial</span>;
    }
    if (is4k) {
        return <span className='seerBadge badge4k'>4K</span>;
    }
    return null;
};

export const SeerMediaCard: FC<SeerMediaCardProps> = ({ item, onClick }) => {
    const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
    const [isLoaded, setIsLoaded] = useState(false);
    const [lowResLoaded, setLowResLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Compute tiny thumbnail URL for progressive loading (TMDB w92 is ~1-2KB)
    const lowResUrl = item.posterPath && item.posterPath.includes('image.tmdb.org')
        ? item.posterPath.replace(/\/w(?:300|500)\//, '/w92/')
        : undefined;

    useEffect(() => {
        setIsLoaded(false);
        setLowResLoaded(false);
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setIsLoaded(true);
        }
    }, [item.posterPath]);

    return (
        <div
            className='seerMediaCard'
            onClick={() => onClick(item)}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(item);
                }
            }}
        >
            <div className='cardBox'>
                {getStatusBadge(item)}
                {item.mediaInfo?.status4k === MediaStatus.AVAILABLE && (
                    <span className='seerBadge badge4k'>4K</span>
                )}
                <div className='cardScalable'>
                    <div className='cardImageContainer'>
                        {item.posterPath ? (
                            <>
                                {lowResUrl && !isLoaded && (
                                    <img
                                        className={`cardImageLowRes ${lowResLoaded ? 'loaded' : ''}`}
                                        src={lowResUrl}
                                        alt=""
                                        aria-hidden="true"
                                        onLoad={() => setLowResLoaded(true)}
                                    />
                                )}
                                <img
                                    ref={imgRef}
                                    className={`cardImage ${isLoaded ? 'loaded' : ''}`}
                                    src={item.posterPath}
                                    alt={item.title}
                                    loading='lazy'
                                    onLoad={() => setIsLoaded(true)}
                                />
                            </>
                        ) : (
                            <div className='cardImagePlaceholder'>
                                <span className='material-icons' style={{ fontSize: '3em' }}>movie</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className='cardFooter'>
                    <div className='cardTitle' title={item.title}>
                        {item.title}
                    </div>
                    <div className='cardSubText'>
                        <span>{item.mediaType === 'tv' ? 'Series' : 'Movie'} {year ? `• ${year}` : ''}</span>
                        {item.voteAverage ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <span className='material-icons' style={{ fontSize: '13px', color: '#f59e0b' }}>star</span>
                                {item.voteAverage.toFixed(1)}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};
