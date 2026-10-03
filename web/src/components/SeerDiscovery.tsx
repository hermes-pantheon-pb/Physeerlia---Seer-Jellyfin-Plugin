import React, { FC, useState, useEffect, useRef, useCallback } from 'react';
import { SeerMediaItem, MediaType } from '../types';
import { seerApi } from '../services/seerApi';
import { SeerMediaCard } from './SeerMediaCard';

interface SeerDiscoveryProps {
    onSelectMedia: (item: SeerMediaItem) => void;
    onBackdropsLoaded?: (backdropUrls: string[]) => void;
}

export const SeerDiscovery: FC<SeerDiscoveryProps> = ({ onSelectMedia, onBackdropsLoaded }) => {
    const [items, setItems] = useState<SeerMediaItem[]>([]);
    const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const pageRef = useRef<number>(1);
    const hasMoreRef = useRef<boolean>(true);
    const isFetchingRef = useRef<boolean>(false);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const filterTypeRef = useRef<MediaType | 'all'>('all');
    const observerRef = useRef<IntersectionObserver | null>(null);

    filterTypeRef.current = filterType;

    const loadItems = useCallback(async (pageToLoad: number, filterToLoad: MediaType | 'all', isReset: boolean) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        if (isReset) {
            setIsLoadingInitial(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await seerApi.getDiscoveryItems(pageToLoad, filterToLoad);
            const newItems: SeerMediaItem[] = [];
            for (const item of response.results) {
                const key = `${item.mediaType}-${item.id}`;
                if (!seenIdsRef.current.has(key)) {
                    seenIdsRef.current.add(key);
                    newItems.push(item);
                }
            }

            const canLoadMore = response.results.length > 0 && (
                typeof response.totalPages === 'number' ? response.page < response.totalPages : true
            );
            hasMoreRef.current = canLoadMore;
            setHasMore(canLoadMore);
            pageRef.current = pageToLoad;

            if (isReset) {
                setItems(newItems);

                // Provide top trending backdrop URLs to Jellyfin's rotating backdrop engine
                const backdrops = newItems
                    .map(i => i.backdropPath)
                    .filter((url): url is string => Boolean(url))
                    .slice(0, 12);

                if (backdrops.length > 0) {
                    onBackdropsLoaded?.(backdrops);
                }
            } else if (newItems.length > 0) {
                setItems(prev => [...prev, ...newItems]);
            } else if (canLoadMore) {
                // If page had only duplicate items, seamlessly load next page
                isFetchingRef.current = false;
                void loadItems(pageToLoad + 1, filterToLoad, false);
                return;
            }
        } catch (err) {
            console.error('Failed to load discovery items', err);
            hasMoreRef.current = false;
            setHasMore(false);
        } finally {
            setIsLoadingInitial(false);
            setIsLoadingMore(false);
            isFetchingRef.current = false;
        }
    }, [onBackdropsLoaded]);

    // Initial load / Filter change effect
    useEffect(() => {
        pageRef.current = 1;
        hasMoreRef.current = true;
        seenIdsRef.current.clear();
        void loadItems(1, filterType, true);
    }, [filterType, loadItems]);

    // Cleanup observer on unmount
    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, []);

    // Callback ref to reliably bind the IntersectionObserver whenever the sentinel node mounts
    const sentinelCallbackRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        if (node) {
            const observer = new IntersectionObserver((entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
                    void loadItems(pageRef.current + 1, filterTypeRef.current, false);
                }
            }, {
                root: null,
                rootMargin: '600px', // Seamless preload well before user hits bottom
                threshold: 0
            });

            observer.observe(node);
            observerRef.current = observer;
        }
    }, [loadItems]);



    return (
        <div>
            {/* Header controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1em', marginBottom: '1.5em' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.35em', color: 'var(--jf-palette-text-primary, #fff)' }}>
                        Trending & Popular Releases
                    </h2>
                    <div style={{ fontSize: '0.85em', color: 'var(--jf-palette-text-secondary, #aaa)', marginTop: '0.2em' }}>
                        Browse top community requests and available media streams
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5em' }}>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterType === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterType('all')}
                    >
                        All
                    </button>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterType === 'movie' ? 'active' : ''}`}
                        onClick={() => setFilterType('movie')}
                    >
                        Movies
                    </button>
                    <button
                        type='button'
                        className={`seerFilterBtn ${filterType === 'tv' ? 'active' : ''}`}
                        onClick={() => setFilterType('tv')}
                    >
                        Series
                    </button>
                </div>
            </div>

            {/* Initial Loading */}
            {isLoadingInitial && (
                <div style={{ textAlign: 'center', padding: '4em 0', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    <span className='material-icons' style={{ animation: 'spin 1s linear infinite', fontSize: '2em' }}>rotate_right</span>
                    <p style={{ margin: '0.5em 0 0 0' }}>Loading media discovery...</p>
                </div>
            )}

            {/* Media Grid */}
            {!isLoadingInitial && items.length > 0 && (
                <div className='seerMediaGrid'>
                    {items.map(item => (
                        <SeerMediaCard
                            key={`${item.mediaType}-${item.id}`}
                            item={item}
                            onClick={onSelectMedia}
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoadingInitial && items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4em 1em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    <span className='material-icons' style={{ fontSize: '3em', opacity: 0.5 }}>movie</span>
                    <p style={{ marginTop: '0.5em' }}>No media found for the selected category.</p>
                </div>
            )}

            {/* Bottom Sentinel for Infinite Scroll */}
            {!isLoadingInitial && hasMore && (
                <div
                    ref={sentinelCallbackRef}
                    style={{ minHeight: '80px', margin: '2em 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {isLoadingMore ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', color: 'var(--jf-palette-text-secondary, #aaa)', fontSize: '0.9em' }}>
                            <span className='material-icons' style={{ animation: 'spin 1s linear infinite', fontSize: '20px' }}>rotate_right</span>
                            <span>Loading more titles...</span>
                        </div>
                    ) : (
                        <button
                            type='button'
                            className='seerFilterBtn'
                            style={{ padding: '0.6em 1.5em', opacity: 0.85 }}
                            onClick={() => {
                                if (!isFetchingRef.current && hasMoreRef.current) {
                                    void loadItems(pageRef.current + 1, filterTypeRef.current, false);
                                }
                            }}
                        >
                            Load More Titles
                        </button>
                    )}
                </div>
            )}

            {/* End of results message */}
            {!isLoadingInitial && !hasMore && items.length > 0 && (
                <div style={{ textAlign: 'center', padding: '2em 0', color: 'var(--jf-palette-text-secondary, #777)', fontSize: '0.85em' }}>
                    <span>You&apos;ve reached the end of the collection</span>
                </div>
            )}
        </div>
    );
};
