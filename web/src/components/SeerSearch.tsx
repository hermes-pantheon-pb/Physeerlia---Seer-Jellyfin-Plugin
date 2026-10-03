import React, { FC, useState, useEffect } from 'react';
import { SeerMediaItem, MediaType } from '../types';
import { seerApi } from '../services/seerApi';
import { SeerMediaCard } from './SeerMediaCard';

interface SeerSearchProps {
    onSelectMedia: (item: SeerMediaItem) => void;
}

export const SeerSearch: FC<SeerSearchProps> = ({ onSelectMedia }) => {
    const [query, setQuery] = useState('');
    const [filterType, setFilterType] = useState<MediaType | 'all'>('all');
    const [results, setResults] = useState<SeerMediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                const items = await seerApi.searchMedia(query);
                setResults(items);
                setHasSearched(true);
            } catch (err) {
                console.error('Search error', err);
            } finally {
                setIsLoading(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [query]);

    const filteredResults = results.filter(item => {
        if (filterType === 'all') return true;
        return item.mediaType === filterType;
    });

    return (
        <div>
            {/* Search Input Bar */}
            <div className='seerSearchBox'>
                <span className='material-icons seerSearchIcon'>search</span>
                <input
                    type='text'
                    className='seerSearchInput'
                    placeholder='Search movies, TV series, or anime in Seer...'
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                {query && (
                    <button
                        type='button'
                        className='seerSearchClear'
                        onClick={() => setQuery('')}
                        aria-label='Clear search'
                    >
                        <span className='material-icons'>close</span>
                    </button>
                )}
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6em', marginBottom: '2em' }}>
                <button
                    type='button'
                    className={`seerFilterBtn ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    All Results
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
                    TV Series
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div style={{ textAlign: 'center', padding: '3em 0', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6em' }}>
                        <span className='material-icons' style={{ animation: 'spin 1s linear infinite' }}>rotate_right</span>
                        <span>Searching Seer database...</span>
                    </div>
                </div>
            )}

            {/* Empty state when searched */}
            {!isLoading && hasSearched && filteredResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3em 1em', color: 'var(--jf-palette-text-secondary, #aaa)' }}>
                    <span className='material-icons' style={{ fontSize: '3.5em', opacity: 0.5, marginBottom: '0.2em' }}>search_off</span>
                    <h3 style={{ margin: '0.4em 0', color: 'var(--jf-palette-text-primary, #fff)' }}>No Media Found</h3>
                    <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9em' }}>
                        No results matched &quot;{query}&quot;. Try searching with an alternate title or check your filter criteria.
                    </p>
                </div>
            )}

            {/* Initial suggestion prompt when empty */}
            {!hasSearched && !isLoading && (
                <div style={{ textAlign: 'center', padding: '2em 1em', color: 'var(--jf-palette-text-secondary, #888)' }}>
                    <p style={{ fontSize: '0.95em', margin: 0 }}>
                        Type the name of any movie or TV series to search TMDB and your Seer instance for instant requests.
                    </p>
                </div>
            )}

            {/* Search Results Grid */}
            {!isLoading && filteredResults.length > 0 && (
                <div className='seerMediaGrid'>
                    {filteredResults.map(item => (
                        <SeerMediaCard
                            key={`${item.mediaType}-${item.id}`}
                            item={item}
                            onClick={onSelectMedia}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
