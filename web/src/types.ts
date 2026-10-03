import { SeerPermission } from './seerPermissions';

export type MediaType = 'movie' | 'tv';

export enum MediaStatus {
    UNKNOWN = 0,
    PENDING = 1,
    PROCESSING = 2,
    PARTIALLY_AVAILABLE = 3,
    AVAILABLE = 4
}

export enum RequestStatus {
    PENDING = 1,
    APPROVED = 2,
    DECLINED = 3,
    PROCESSING = 4,
    AVAILABLE = 5
}

export interface SeerMediaInfo {
    id: number;
    tmdbId: number;
    tvdbId?: number;
    status: MediaStatus;
    status4k?: MediaStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface SeerEpisode {
    id: number;
    episodeNumber: number;
    name: string;
    airDate?: string;
    overview?: string;
    status?: MediaStatus;
}

export interface SeerSeason {
    id: number;
    seasonNumber: number;
    name: string;
    episodeCount: number;
    airDate?: string;
    posterPath?: string;
    overview?: string;
    status?: MediaStatus;
    episodes?: SeerEpisode[];
}

export interface SeerMediaItem {
    id: number;
    mediaType: MediaType;
    title: string;
    originalTitle?: string;
    overview: string;
    posterPath: string;
    backdropPath?: string;
    releaseDate?: string;
    voteAverage?: number;
    voteCount?: number;
    mediaInfo?: SeerMediaInfo;
    genres?: string[];
    seasons?: SeerSeason[];
}

export interface SeerServer {
    id: number;
    name: string;
    is4k: boolean;
    isDefault: boolean;
    activeProfileId: number;
    activeProfileName?: string;
    activeDirectory: string;
}

export interface SeerProfile {
    id: number;
    name: string;
}

export interface SeerServerDetails {
    server?: SeerServer;
    profiles: SeerProfile[];
    rootFolders: SeerRootFolder[];
}


export interface SeerRootFolder {
    id: number;
    name: string;
    path: string;
    freeSpace?: string;
}

export interface SeerUser {
    id: number;
    email: string;
    username: string;
    avatar?: string;
    permissions: number;
    requestCount: number;
}

export interface SeerRequest {
    id: number;
    status: RequestStatus;
    createdAt: string;
    updatedAt: string;
    type: MediaType;
    is4k: boolean;
    serverId?: number;
    serverName?: string;
    profileId?: number;
    profileName?: string;
    rootFolder?: string;
    media: SeerMediaItem;
    seasons?: number[];
    requestedBy: {
        id: number;
        username: string;
        avatar?: string;
    };
    modifiedBy?: {
        id: number;
        username: string;
    };
}

export interface CreateRequestPayload {
    mediaType: MediaType;
    mediaId: number;
    seasons?: number[] | 'all';
    is4k?: boolean;
    serverId?: number;
    profileId?: number;
    rootFolder?: string;
    languageProfileId?: number;
    tags?: number[];
}

export interface LoginCredentials {
    serverUrl?: string;
    username: string;
    password: string;
    authProvider?: 'jellyfin' | 'local';
}

export interface AuthSession {
    isAuthenticated: boolean;
    user: SeerUser | null;
    serverUrl: string;
}

