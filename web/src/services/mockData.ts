import {
    SeerMediaItem,
    SeerRequest,
    SeerServer,
    SeerProfile,
    SeerRootFolder,
    MediaStatus,
    RequestStatus
} from '../types';

export const MOCK_SERVERS: Record<'movie' | 'tv', SeerServer[]> = {
    movie: [
        {
            id: 1,
            name: 'Radarr Primary (Standard HD)',
            is4k: false,
            isDefault: true,
            activeProfileId: 1,
            activeProfileName: 'HD - 1080p',
            activeDirectory: '/data/media/movies'
        },
        {
            id: 2,
            name: 'Radarr Ultra-HD (4K HDR)',
            is4k: true,
            isDefault: false,
            activeProfileId: 3,
            activeProfileName: 'Ultra-HD 4K',
            activeDirectory: '/data/media/movies-4k'
        },
        {
            id: 3,
            name: 'Radarr Anime & International',
            is4k: false,
            isDefault: false,
            activeProfileId: 2,
            activeProfileName: 'Anime 1080p',
            activeDirectory: '/data/media/anime-movies'
        }
    ],
    tv: [
        {
            id: 10,
            name: 'Sonarr Primary (Standard HD)',
            is4k: false,
            isDefault: true,
            activeProfileId: 101,
            activeProfileName: 'HD - 1080p Series',
            activeDirectory: '/data/media/tv-shows'
        },
        {
            id: 11,
            name: 'Sonarr Anime & Animation',
            is4k: false,
            isDefault: false,
            activeProfileId: 102,
            activeProfileName: 'Anime Dual-Audio',
            activeDirectory: '/data/media/anime-shows'
        },
        {
            id: 12,
            name: 'Sonarr 4K Ultra-HD Series',
            is4k: true,
            isDefault: false,
            activeProfileId: 103,
            activeProfileName: '4K Series',
            activeDirectory: '/data/media/tv-4k'
        }
    ]
};

export const MOCK_PROFILES: SeerProfile[] = [
    { id: 1, name: 'HD - 1080p (Standard)' },
    { id: 2, name: 'Anime 1080p (Dual Audio)' },
    { id: 3, name: 'Ultra-HD 4K (HDR / Dolby Vision)' },
    { id: 4, name: 'Remux - Lossless Quality' },
    { id: 5, name: '720p / 1080p Balanced' }
];

export const MOCK_ROOT_FOLDERS: Record<'movie' | 'tv', SeerRootFolder[]> = {
    movie: [
        { id: 1, name: 'Main Movies Pool', path: '/data/media/movies', freeSpace: '4.8 TB Free' },
        { id: 2, name: '4K Ultra-HD Library', path: '/data/media/movies-4k', freeSpace: '8.2 TB Free' },
        { id: 3, name: 'Anime Movies Storage', path: '/data/media/anime-movies', freeSpace: '2.1 TB Free' },
        { id: 4, name: 'Family & Kids Movies', path: '/data/media/family-movies', freeSpace: '1.4 TB Free' }
    ],
    tv: [
        { id: 10, name: 'TV Series Primary', path: '/data/media/tv-shows', freeSpace: '6.4 TB Free' },
        { id: 11, name: 'Anime Series Storage', path: '/data/media/anime-shows', freeSpace: '3.7 TB Free' },
        { id: 12, name: 'Documentaries & Specials', path: '/data/media/docs', freeSpace: '950 GB Free' }
    ]
};

export const MOCK_DISCOVERY_ITEMS: SeerMediaItem[] = [
    {
        id: 693134,
        mediaType: 'movie',
        title: 'Dune: Part Two',
        overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
        posterPath: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5200SV.jpg',
        releaseDate: '2024-03-01',
        voteAverage: 8.2,
        voteCount: 4720,
        genres: ['Science Fiction', 'Adventure'],
        mediaInfo: {
            id: 101,
            tmdbId: 693134,
            status: MediaStatus.AVAILABLE,
            status4k: MediaStatus.AVAILABLE
        }
    },
    {
        id: 94605,
        mediaType: 'tv',
        title: 'Arcane',
        overview: 'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.',
        posterPath: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397rgg3dc9T.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/original/rkB4LyZHo1NHXSTXYZaGzyDc91U.jpg',
        releaseDate: '2021-11-06',
        voteAverage: 8.7,
        voteCount: 3890,
        genres: ['Animation', 'Sci-Fi & Fantasy', 'Action & Adventure'],
        mediaInfo: {
            id: 102,
            tmdbId: 94605,
            status: MediaStatus.AVAILABLE,
            status4k: MediaStatus.UNKNOWN
        },
        seasons: [
            {
                id: 134187,
                seasonNumber: 1,
                name: 'Season 1',
                episodeCount: 9,
                airDate: '2021-11-06',
                status: MediaStatus.AVAILABLE
            },
            {
                id: 341824,
                seasonNumber: 2,
                name: 'Season 2',
                episodeCount: 9,
                airDate: '2024-11-09',
                status: MediaStatus.PARTIALLY_AVAILABLE
            }
        ]
    },
    {
        id: 533535,
        mediaType: 'movie',
        title: 'Deadpool & Wolverine',
        overview: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again.',
        posterPath: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/original/yDHYTjA3R0jFYba16jBB1jv82E9.jpg',
        releaseDate: '2024-07-26',
        voteAverage: 7.7,
        voteCount: 3400,
        genres: ['Action', 'Comedy', 'Science Fiction'],
        mediaInfo: {
            id: 103,
            tmdbId: 533535,
            status: MediaStatus.PENDING,
            status4k: MediaStatus.UNKNOWN
        }
    },
    {
        id: 100088,
        mediaType: 'tv',
        title: 'The Last of Us',
        overview: 'Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone.',
        posterPath: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrRI.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
        releaseDate: '2023-01-15',
        voteAverage: 8.6,
        voteCount: 4600,
        genres: ['Drama', 'Sci-Fi & Fantasy', 'Action & Adventure'],
        mediaInfo: {
            id: 104,
            tmdbId: 100088,
            status: MediaStatus.AVAILABLE
        },
        seasons: [
            {
                id: 144598,
                seasonNumber: 1,
                name: 'Season 1',
                episodeCount: 9,
                airDate: '2023-01-15',
                status: MediaStatus.AVAILABLE
            },
            {
                id: 334992,
                seasonNumber: 2,
                name: 'Season 2',
                episodeCount: 7,
                airDate: '2025-03-01',
                status: MediaStatus.UNKNOWN
            }
        ]
    },
    {
        id: 1022789,
        mediaType: 'movie',
        title: 'Inside Out 2',
        overview: 'Teenager Riley\'s mind headquarters is undergoing a sudden demolition to make room for something entirely unexpected: new Emotions! Joy, Sadness, Anger, Fear and Disgust aren\'t sure how to feel when Anxiety shows up.',
        posterPath: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/original/stKGOm8wqhnLPRUR1bMHZqTAKKm.jpg',
        releaseDate: '2024-06-14',
        voteAverage: 7.6,
        voteCount: 4100,
        genres: ['Animation', 'Family', 'Comedy', 'Adventure'],
        mediaInfo: {
            id: 105,
            tmdbId: 1022789,
            status: MediaStatus.AVAILABLE
        }
    },
    {
        id: 111110,
        mediaType: 'tv',
        title: 'ONE PIECE (Live Action)',
        overview: 'With his straw hat and ragtag crew, young pirate Monkey D. Luffy goes on an epic voyage for treasure in this live-action adaptation of the popular manga.',
        posterPath: 'https://image.tmdb.org/t/p/w500/fcXdJUSDiXt1L1J14ApB37aDEFz.jpg',
        backdropPath: 'https://image.tmdb.org/t/p/original/4fLZUr1eSlAExBhFiRBsnGmwh4U.jpg',
        releaseDate: '2023-08-31',
        voteAverage: 8.2,
        voteCount: 1250,
        genres: ['Action & Adventure', 'Sci-Fi & Fantasy', 'Comedy'],
        seasons: [
            {
                id: 167389,
                seasonNumber: 1,
                name: 'Season 1',
                episodeCount: 8,
                airDate: '2023-08-31',
                status: MediaStatus.AVAILABLE
            },
            {
                id: 329001,
                seasonNumber: 2,
                name: 'Season 2',
                episodeCount: 8,
                airDate: '2025-08-15',
                status: MediaStatus.UNKNOWN
            }
        ]
    },
    {
        id: 762441,
        mediaType: 'movie',
        title: 'A Quiet Place: Day One',
        overview: 'As New York City is invaded by alien creatures who hunt by sound, a woman named Sam fights to survive with her service cat.',
        posterPath: 'https://image.tmdb.org/t/p/w500/yrpPYK2qm969CuEN79p0g2ypfMV.jpg',
        releaseDate: '2024-06-28',
        voteAverage: 6.8,
        genres: ['Horror', 'Science Fiction', 'Thriller'],
        mediaInfo: {
            id: 106,
            tmdbId: 762441,
            status: MediaStatus.PROCESSING
        }
    },
    {
        id: 1399,
        mediaType: 'tv',
        title: 'Game of Thrones',
        overview: 'Seven noble families fight for control of the mythical land of Westeros. Friction between the houses leads to full-scale war.',
        posterPath: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        releaseDate: '2011-04-17',
        voteAverage: 8.4,
        genres: ['Sci-Fi & Fantasy', 'Drama', 'Action & Adventure'],
        mediaInfo: {
            id: 107,
            tmdbId: 1399,
            status: MediaStatus.AVAILABLE
        },
        seasons: [
            { id: 1, seasonNumber: 1, name: 'Season 1', episodeCount: 10, airDate: '2011-04-17', status: MediaStatus.AVAILABLE },
            { id: 2, seasonNumber: 2, name: 'Season 2', episodeCount: 10, airDate: '2012-04-01', status: MediaStatus.AVAILABLE },
            { id: 3, seasonNumber: 3, name: 'Season 3', episodeCount: 10, airDate: '2013-03-31', status: MediaStatus.AVAILABLE },
            { id: 4, seasonNumber: 4, name: 'Season 4', episodeCount: 10, airDate: '2014-04-06', status: MediaStatus.AVAILABLE },
            { id: 5, seasonNumber: 5, name: 'Season 5', episodeCount: 10, airDate: '2015-04-12', status: MediaStatus.AVAILABLE },
            { id: 6, seasonNumber: 6, name: 'Season 6', episodeCount: 10, airDate: '2016-04-24', status: MediaStatus.AVAILABLE },
            { id: 7, seasonNumber: 7, name: 'Season 7', episodeCount: 7, airDate: '2017-07-16', status: MediaStatus.AVAILABLE },
            { id: 8, seasonNumber: 8, name: 'Season 8', episodeCount: 6, airDate: '2019-04-14', status: MediaStatus.AVAILABLE }
        ]
    }
];

export const MOCK_REQUESTS: SeerRequest[] = [
    {
        id: 501,
        status: RequestStatus.PENDING,
        createdAt: '2026-09-30T16:20:00Z',
        updatedAt: '2026-09-30T16:20:00Z',
        type: 'movie',
        is4k: false,
        serverId: 1,
        serverName: 'Radarr Primary (Standard HD)',
        profileId: 1,
        profileName: 'HD - 1080p',
        rootFolder: '/data/media/movies',
        media: MOCK_DISCOVERY_ITEMS[2], // Deadpool & Wolverine
        requestedBy: {
            id: 12,
            username: 'alex_media',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'
        }
    },
    {
        id: 502,
        status: RequestStatus.PROCESSING,
        createdAt: '2026-09-29T11:45:00Z',
        updatedAt: '2026-09-29T12:00:00Z',
        type: 'movie',
        is4k: true,
        serverId: 2,
        serverName: 'Radarr Ultra-HD (4K HDR)',
        profileId: 3,
        profileName: 'Ultra-HD 4K (HDR / Dolby Vision)',
        rootFolder: '/data/media/movies-4k',
        media: MOCK_DISCOVERY_ITEMS[6], // A Quiet Place
        requestedBy: {
            id: 1,
            username: 'admin',
            avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80'
        }
    },
    {
        id: 503,
        status: RequestStatus.APPROVED,
        createdAt: '2026-09-28T09:15:00Z',
        updatedAt: '2026-09-28T10:00:00Z',
        type: 'tv',
        is4k: false,
        serverId: 10,
        serverName: 'Sonarr Primary (Standard HD)',
        profileId: 101,
        profileName: 'HD - 1080p Series',
        rootFolder: '/data/media/tv-shows',
        media: MOCK_DISCOVERY_ITEMS[5], // One Piece
        seasons: [2],
        requestedBy: {
            id: 7,
            username: 'sarah_m',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80'
        },
        modifiedBy: {
            id: 1,
            username: 'admin'
        }
    },
    {
        id: 504,
        status: RequestStatus.AVAILABLE,
        createdAt: '2026-09-25T14:30:00Z',
        updatedAt: '2026-09-25T15:20:00Z',
        type: 'movie',
        is4k: false,
        serverId: 1,
        serverName: 'Radarr Primary (Standard HD)',
        profileId: 1,
        profileName: 'HD - 1080p',
        rootFolder: '/data/media/movies',
        media: MOCK_DISCOVERY_ITEMS[0], // Dune 2
        requestedBy: {
            id: 1,
            username: 'admin'
        }
    }
];
