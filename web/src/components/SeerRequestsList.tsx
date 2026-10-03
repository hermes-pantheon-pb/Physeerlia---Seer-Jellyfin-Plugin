import React, { FC, useState, useEffect } from 'react';
import { SeerRequest, RequestStatus } from '../types';
import { seerApi } from '../services/seerApi';
import { canManageRequests } from '../seerPermissions';

interface SeerRequestsListProps {
    refreshKey: number;
}

const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
        case RequestStatus.AVAILABLE:
            return <span className='seerBadge statusAvailable' style={{ position: 'static' }}>Available</span>;
        case RequestStatus.APPROVED:
            return <span className='seerBadge statusAvailable' style={{ position: 'static', backgroundColor: '#1976d2' }}>Approved</span>;
        case RequestStatus.PROCESSING:
            return <span className='seerBadge statusProcessing' style={{ position: 'static' }}>Processing</span>;
        case RequestStatus.PENDING:
            return <span className='seerBadge statusPending' style={{ position: 'static' }}>Pending Review</span>;
        case RequestStatus.DECLINED:
            return <span className='seerBadge' style={{ position: 'static', backgroundColor: '#d32f2f', color: '#fff' }}>Declined</span>;
        default:
            return null;
    }
};

export const SeerRequestsList: FC<SeerRequestsListProps> = ({ refreshKey }) => {
    const [requests, setRequests] = useState<SeerRequest[]>([]);
    const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
    const [isLoading, setIsLoading] = useState(true);

    const currentUser = seerApi.getCurrentUser();
    const isManager = currentUser ? canManageRequests(currentUser.permissions) : false;

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await seerApi.getRequests();
            setRequests(data);
        } catch (err) {
            console.error('Failed to load requests', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchRequests();
    }, [refreshKey]);

    const handleApprove = async (id: number) => {
        await seerApi.approveRequest(id);
        void fetchRequests();
    };

    const handleDecline = async (id: number) => {
        await seerApi.declineRequest(id);
        void fetchRequests();
    };

    const handleDelete = async (id: number) => {
        await seerApi.deleteRequest(id);
        void fetchRequests();
    };

    const filteredRequests = requests.filter(r => {
        if (filterStatus === 'all') return true;
        return r.status === filterStatus;
    });

    return (
        <div>
            {/* Filter buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8em', marginBottom: '1.5em' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em' }}>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        All ({requests.length})
                    </button>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterStatus === RequestStatus.PENDING ? 'active' : ''}`}
                        onClick={() => setFilterStatus(RequestStatus.PENDING)}
                    >
                        Pending ({requests.filter(r => r.status === RequestStatus.PENDING).length})
                    </button>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterStatus === RequestStatus.PROCESSING ? 'active' : ''}`}
                        onClick={() => setFilterStatus(RequestStatus.PROCESSING)}
                    >
                        Processing ({requests.filter(r => r.status === RequestStatus.PROCESSING).length})
                    </button>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterStatus === RequestStatus.AVAILABLE ? 'active' : ''}`}
                        onClick={() => setFilterStatus(RequestStatus.AVAILABLE)}
                    >
                        Available ({requests.filter(r => r.status === RequestStatus.AVAILABLE).length})
                    </button>
                </div>

                <button
                    type='button'
                    className='seerActionBtn'
                    onClick={fetchRequests}
                >
                    <span className='material-icons' style={{ fontSize: '1.2em' }}>refresh</span>
                    Refresh
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div style={{ textAlign: 'center', padding: '3em 0', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    <span className='material-icons' style={{ animation: 'spin 1s linear infinite' }}>rotate_right</span>
                    <p>Loading requests list...</p>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredRequests.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3em 1em', color: 'var(--jf-palette-text-secondary, #888)' }}>
                    <span className='material-icons' style={{ fontSize: '3.5em', opacity: 0.4 }}>inbox</span>
                    <h3 style={{ margin: '0.4em 0', color: 'var(--jf-palette-text-primary, #fff)' }}>No Requests Found</h3>
                    <p style={{ margin: 0, fontSize: '0.9em' }}>
                        There are currently no media requests matching the selected filter.
                    </p>
                </div>
            )}

            {/* Requests list */}
            {!isLoading && filteredRequests.length > 0 && (
                <div className='seerRequestsContainer'>
                    {filteredRequests.map(req => {
                        const dateFormatted = new Date(req.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <div key={req.id} className='seerRequestCard'>
                                {req.media.posterPath ? (
                                    <img className='requestPoster' src={req.media.posterPath} alt={req.media.title} />
                                ) : (
                                    <div className='requestPoster' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--jf-palette-background-card, rgba(255,255,255,0.05))', color: 'var(--jf-palette-text-secondary, #888)', borderRadius: '4px' }}>
                                        <span className='material-icons' style={{ fontSize: '2em' }}>{req.type === 'tv' ? 'tv' : 'movie'}</span>
                                    </div>
                                )}

                                <div className='requestDetails'>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', flexWrap: 'wrap' }}>
                                        <span className='requestTitle'>{req.media.title}</span>
                                        {getStatusBadge(req.status)}
                                        {req.is4k && <span className='seerBadge badge4k' style={{ position: 'static' }}>4K</span>}
                                    </div>

                                    <div className='requestMeta'>
                                        <span>Type: <strong>{req.type === 'tv' ? 'TV Series' : 'Movie'}</strong></span>
                                        <span>Requested by: <strong>{req.requestedBy.username}</strong></span>
                                        <span>Date: <strong>{dateFormatted}</strong></span>
                                        {req.seasons?.length ? (
                                            <span>Seasons: <strong>Season {req.seasons.join(', ')}</strong></span>
                                        ) : null}
                                    </div>

                                    {(req.serverName || req.profileName || req.rootFolder) && (
                                        <div className='requestDelegation'>
                                            <span>Delegation: </span>
                                            {req.serverName && <span>[{req.serverName}] </span>}
                                            {req.profileName && <span>• Profile: {req.profileName} </span>}
                                            {req.rootFolder && <span>• Path: {req.rootFolder}</span>}
                                        </div>
                                    )}
                                </div>

                                <div className='requestActions'>
                                    {isManager && req.status === RequestStatus.PENDING && (
                                        <>
                                            <button
                                                type='button'
                                                className='btnApprove'
                                                onClick={() => handleApprove(req.id)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type='button'
                                                className='btnDecline'
                                                onClick={() => handleDecline(req.id)}
                                            >
                                                Decline
                                            </button>
                                        </>
                                    )}

                                    <button
                                        type='button'
                                        className='btnDelete'
                                        title='Cancel or delete request'
                                        onClick={() => handleDelete(req.id)}
                                    >
                                        <span className='material-icons' style={{ fontSize: '16px', marginRight: '0.2em' }}>delete</span>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
