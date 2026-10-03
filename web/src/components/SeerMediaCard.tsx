import React, { FC } from 'react';
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
                            <img
                                className='cardImage'
                                src={item.posterPath}
                                alt={item.title}
                                loading='lazy'
                            />
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
