import {
    SeerMediaItem,
    SeerRequest,
    SeerUser,
    SeerServer,
    SeerServerDetails,
    SeerProfile,
    SeerRootFolder,
    SeerSeason,
    SeerEpisode,
    CreateRequestPayload,
    RequestStatus,
    MediaStatus,
    MediaType,
    LoginCredentials
} from '../types';

import {
    canAutoApprove,
    hasPermission,
    SeerPermission
} from '../seerPermissions';

const STORAGE_KEYS = {
    URL: 'seer_server_url',
    USER: 'seer_session_user'
};

class SeerApiService {
    private serverUrl: string;
    private currentUser: SeerUser | null = null;
    private mediaCache: Map<string, SeerMediaItem> = new Map();


    constructor() {
        // Default to the user's Seer server URL
        this.serverUrl = localStorage.getItem(STORAGE_KEYS.URL) || 'http://localhost:5055';

        // Restore cached user session if present
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
                if (this.currentUser && (!this.currentUser.username || this.currentUser.username.trim() === '')) {
                    this.currentUser.username = this.currentUser.email
                        ? this.currentUser.email.split('@')[0]
                        : 'User';
                }
            } catch {
                this.currentUser = null;
            }
        }
    }

    public getServerUrl(): string {
        return this.serverUrl;
    }

    public setServerUrl(url: string) {
        this.serverUrl = url.trim().replace(/\/+$/, '');
        localStorage.setItem(STORAGE_KEYS.URL, this.serverUrl);
    }

    public isAuthenticated(): boolean {
        return this.currentUser !== null;
    }

    public getCurrentUser(): SeerUser | null {
        return this.currentUser;
    }

    private saveUserSession(user: SeerUser | null) {
        if (user && (!user.username || user.username.trim() === '')) {
            user.username = (user.email && user.email.includes('@'))
                ? user.email.split('@')[0]
                : 'User';
        }
        this.currentUser = user;
        if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    }

    /**
     * Resolves the request URL through the local reverse proxy to bypass browser CORS
     */
    private getEndpoint(path: string): string {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return `/Plugins/Seer/Proxy${cleanPath}`;
    }

    /**
     * Helper to perform authenticated requests to Seer through the reverse proxy
     */
    private async request(path: string, options: RequestInit = {}): Promise<Response> {
        const url = this.getEndpoint(path);
        const headers = new Headers(options.headers || {});
        headers.set('X-Seer-Url', this.serverUrl);

        return fetch(url, {
            ...options,
            headers,
            credentials: 'include'
        });
    }

    /**
     * Test connection to Seer server status endpoint
     */
    public async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
        if (!this.serverUrl) {
            return { success: false, message: 'Server URL is not configured' };
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await this.request('/api/v1/status', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                return {
                    success: true,
                    message: `Connected successfully to Seer (version: ${data.version || 'v3.x'})`,
                    version: data.version
                };
            }
            return { success: false, message: `Server returned HTTP ${res.status}: ${res.statusText}` };
        } catch (err: unknown) {
            return {
                success: false,
                message: err instanceof Error ? err.message : 'Unable to connect to Seer server'
            };
        }
    }

    /**
     * Authenticate user session with Seer
     */
    public async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: SeerUser; message?: string }> {
        if (credentials.serverUrl) {
            this.setServerUrl(credentials.serverUrl);
        }

        const endpoint = credentials.authProvider === 'local'
            ? '/api/v1/auth/local'
            : '/api/v1/auth/jellyfin';

        const body = credentials.authProvider === 'local'
            ? { email: credentials.username, password: credentials.password }
            : { username: credentials.username, password: credentials.password };

        try {
            const res = await this.request(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const userData = await res.json();
                const username = userData.displayName || userData.username || userData.jellyfinUsername || credentials.username || 'User';
                const user: SeerUser = {
                    id: userData.id,
                    username,
                    email: userData.email || '',
                    avatar: userData.avatar,
                    permissions: typeof userData.permissions === 'number' ? userData.permissions : 0,
                    requestCount: userData.requestCount || 0
                };
                this.saveUserSession(user);
                return { success: true, user, message: 'Signed in successfully' };
            } else {
                const errorData = await res.json().catch(() => null);
                const message = errorData?.message || `Authentication failed with status HTTP ${res.status}`;
                return { success: false, message };
            }
        } catch (err: unknown) {
            return {
                success: false,
                message: err instanceof Error ? err.message : 'Network error connecting to Seer'
            };
        }
    }

    /**
     * Check if current session is active and sync permissions from server
     */
    public async checkSession(): Promise<SeerUser | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await this.request('/api/v1/auth/me', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const userData = await res.json();
                const username = userData.displayName || userData.username || userData.jellyfinUsername || userData.plexUsername || (userData.email ? userData.email.split('@')[0] : '') || this.currentUser?.username || 'User';
                const user: SeerUser = {
                    id: userData.id,
                    username,
                    email: userData.email || '',
                    avatar: userData.avatar,
                    permissions: typeof userData.permissions === 'number' ? userData.permissions : (this.currentUser?.permissions || 0),
                    requestCount: userData.requestCount || 0
                };
                this.saveUserSession(user);
                return user;
            } else if (res.status === 401 || res.status === 403) {
                this.saveUserSession(null);
                return null;
            }
        } catch (e) {
            console.warn('Session verification check failed', e);
        }

        return this.currentUser;
    }

    /**
     * Sign out active session
     */
    public async logout(): Promise<void> {
        try {
            await this.request('/api/v1/auth/logout', { method: 'POST' });
        } catch (e) {
            console.warn('Logout API call error', e);
        }
        this.saveUserSession(null);
    }

    public getCachedMedia(mediaType: MediaType, mediaId: number): SeerMediaItem | undefined {
        return this.mediaCache.get(`${mediaType}_${mediaId}`);
    }

    public setCachedMedia(mediaType: MediaType, mediaId: number, item: SeerMediaItem): void {
        this.mediaCache.set(`${mediaType}_${mediaId}`, item);
    }

    public async getDiscoveryItems(page: number = 1, filter: MediaType | 'all' = 'all'): Promise<{ results: SeerMediaItem[]; page: number; totalPages: number }> {
        const typeParam = filter && filter !== 'all' ? filter : undefined;
        const endpoint = typeParam === 'movie'
            ? `/api/v1/discover/movies?page=${page}`
            : typeParam === 'tv'
                ? `/api/v1/discover/tv?page=${page}`
                : `/api/v1/discover/trending?page=${page}`;

        try {
            const res = await this.request(endpoint);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.results)) {
                    const results = data.results.map((item: any) => {
                        const mapped = this.mapApiMediaItem(item, typeParam);
                        this.setCachedMedia(mapped.mediaType, mapped.id, mapped);
                        return mapped;
                    });
                    const totalPages = typeof data.totalPages === 'number'
                        ? data.totalPages
                        : typeof data.total_pages === 'number'
                            ? data.total_pages
                            : (results.length > 0 ? page + 10 : page);
                    return {
                        results,
                        page: typeof data.page === 'number' ? data.page : page,
                        totalPages
                    };
                }
            } else if (typeParam) {
                // If specific /movies or /tv endpoint returns non-200, fall back to /trending?page=
                const fallbackRes = await this.request(`/api/v1/discover/trending?page=${page}`);
                if (fallbackRes.ok) {
                    const fallbackData = await fallbackRes.json();
                    if (Array.isArray(fallbackData?.results)) {
                        const filtered = fallbackData.results
                            .filter((item: any) => {
                                const type = item.mediaType || (item.name || item.firstAirDate ? 'tv' : 'movie');
                                return type === typeParam;
                            })
                            .map((item: any) => {
                                const mapped = this.mapApiMediaItem(item, typeParam);
                                this.setCachedMedia(mapped.mediaType, mapped.id, mapped);
                                return mapped;
                            });
                        const totalPages = typeof fallbackData.totalPages === 'number'
                            ? fallbackData.totalPages
                            : typeof fallbackData.total_pages === 'number'
                                ? fallbackData.total_pages
                                : (filtered.length > 0 ? page + 10 : page);
                        return {
                            results: filtered,
                            page: typeof fallbackData.page === 'number' ? fallbackData.page : page,
                            totalPages
                        };
                    }
                }
            }
        } catch (e) {
            console.error(`Failed to fetch discovery items (page ${page}) from Seer`, e);
        }
        return { results: [], page, totalPages: page };
    }

    public async searchMedia(query: string): Promise<SeerMediaItem[]> {
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) return [];

        try {
            const res = await this.request(`/api/v1/search?query=${encodeURIComponent(cleanQuery)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.results)) {
                    return data.results.map((item: any) => {
                        const mapped = this.mapApiMediaItem(item);
                        this.setCachedMedia(mapped.mediaType, mapped.id, mapped);
                        return mapped;
                    });
                }
            }
        } catch (e) {
            console.error('Failed to search media in Seer', e);
        }
        return [];
    }

    public async getMediaDetails(mediaType: MediaType, mediaId: number): Promise<SeerMediaItem | null> {
        const cached = this.getCachedMedia(mediaType, mediaId);
        const hasCompleteData = cached && (
            mediaType === 'tv'
                ? Array.isArray(cached.seasons) && cached.seasons.length > 0
                : Boolean(cached.overview || (cached.title && cached.title !== 'Unknown Title'))
        );

        if (cached && hasCompleteData) {
            return cached;
        }

        try {
            const res = await this.request(`/api/v1/${mediaType}/${mediaId}`);
            if (res.ok) {
                const data = await res.json();
                const mapped = this.mapApiMediaItem(data, mediaType);

                this.setCachedMedia(mediaType, mediaId, mapped);
                return mapped;
            }
        } catch (e) {
            console.error(`Failed to fetch media details for ${mediaType} ${mediaId}`, e);
        }
        return cached || null;
    }

    /**
     * Fetches detailed episode list for a specific season of a TV show
     */
    public async getSeasonDetails(tvId: number, seasonNumber: number): Promise<SeerEpisode[]> {
        try {
            const res = await this.request(`/api/v1/tv/${tvId}/season/${seasonNumber}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.episodes)) {
                    return data.episodes.map((ep: any) => ({
                        id: ep.id,
                        episodeNumber: ep.episodeNumber,
                        name: ep.name || `Episode ${ep.episodeNumber}`,
                        airDate: ep.airDate,
                        overview: ep.overview,
                        status: ep.status
                    }));
                }
            }
        } catch (e) {
            console.warn(`Failed to fetch season ${seasonNumber} details for TV ${tvId}`, e);
        }
        return [];
    }


    public async getServers(mediaType: MediaType): Promise<SeerServer[]> {
        const endpoint = mediaType === 'movie' ? '/api/v1/service/radarr' : '/api/v1/service/sonarr';
        try {
            const res = await this.request(endpoint);
            if (res.ok) {
                const servers = await res.json();
                if (Array.isArray(servers)) {
                    return servers.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        is4k: Boolean(s.is4k),
                        isDefault: Boolean(s.isDefault),
                        activeProfileId: s.activeProfileId,
                        activeProfileName: s.activeProfileName,
                        activeDirectory: s.activeDirectory
                    }));
                }
            }
        } catch (e) {
            console.error(`Failed to fetch ${mediaType} servers from Seer`, e);
        }
        return [];
    }

    /**
     * Fetches detailed quality profiles and root storage folders for a specific Radarr or Sonarr server
     */
    public async getServerDetails(mediaType: MediaType, serverId: number): Promise<SeerServerDetails> {
        const endpoint = mediaType === 'movie'
            ? `/api/v1/service/radarr/${serverId}`
            : `/api/v1/service/sonarr/${serverId}`;

        try {
            const res = await this.request(endpoint);
            if (res.ok) {
                const data = await res.json();
                const profiles: SeerProfile[] = Array.isArray(data?.profiles)
                    ? data.profiles.map((p: any) => ({
                        id: p.id,
                        name: p.name
                    }))
                    : [];

                const rootFolders: SeerRootFolder[] = Array.isArray(data?.rootFolders)
                    ? data.rootFolders.map((rf: any) => {
                        const freeSpaceGb = rf.freeSpace ? Math.round(rf.freeSpace / (1024 * 1024 * 1024)) : undefined;
                        return {
                            id: rf.id,
                            name: rf.path,
                            path: rf.path,
                            freeSpace: freeSpaceGb !== undefined ? `${freeSpaceGb} GB Free` : undefined
                        };
                    })
                    : [];

                const server: SeerServer | undefined = data?.server ? {
                    id: data.server.id,
                    name: data.server.name,
                    is4k: Boolean(data.server.is4k),
                    isDefault: Boolean(data.server.isDefault),
                    activeProfileId: data.server.activeProfileId,
                    activeProfileName: data.server.activeProfileName,
                    activeDirectory: data.server.activeDirectory
                } : undefined;

                return { server, profiles, rootFolders };
            }
        } catch (e) {
            console.warn(`Failed to fetch server details for ${mediaType} #${serverId}`, e);
        }

        return { profiles: [], rootFolders: [] };
    }

    public async getProfiles(mediaType: MediaType = 'movie', serverId?: number): Promise<SeerProfile[]> {
        const servers = await this.getServers(mediaType);
        if (servers.length === 0) return [];

        const targetServer = serverId !== undefined
            ? servers.find(s => s.id === serverId)
            : (servers.find(s => s.isDefault) || servers[0]);

        if (!targetServer) return [];

        const details = await this.getServerDetails(mediaType, targetServer.id);
        if (details.profiles.length > 0) {
            return details.profiles;
        }

        // Fallback: If live Radarr/Sonarr profiles couldn't be loaded, use activeProfileId configured on server
        if (targetServer.activeProfileId !== undefined) {
            return [{
                id: targetServer.activeProfileId,
                name: targetServer.activeProfileName || `Default Profile (${targetServer.activeProfileId})`
            }];
        }

        return [];
    }

    public async getRootFolders(mediaType: MediaType = 'movie', serverId?: number): Promise<SeerRootFolder[]> {
        const servers = await this.getServers(mediaType);
        if (servers.length === 0) return [];

        const targetServer = serverId !== undefined
            ? servers.find(s => s.id === serverId)
            : (servers.find(s => s.isDefault) || servers[0]);

        if (!targetServer) return [];

        const details = await this.getServerDetails(mediaType, targetServer.id);
        if (details.rootFolders.length > 0) {
            return details.rootFolders;
        }

        // Fallback: If live root folders couldn't be queried, use activeDirectory configured on server
        if (targetServer.activeDirectory) {
            return [{
                id: 1,
                name: targetServer.activeDirectory,
                path: targetServer.activeDirectory
            }];
        }

        return [];
    }

    public async getRequests(filterStatus?: RequestStatus): Promise<SeerRequest[]> {
        try {
            const filterQuery = filterStatus ? `&filter=${filterStatus}` : '';
            const res = await this.request(`/api/v1/request?take=50${filterQuery}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.results)) {
                    // Enrich requests with real media titles, posters, and details via TMDB lookup
                    const enrichedRequests = await Promise.all(
                        data.results.map(async (r: any) => {
                            const mediaType: MediaType = r.type || r.media?.mediaType || (r.seasons ? 'tv' : 'movie');
                            const tmdbId = r.media?.tmdbId || r.mediaId;

                            let mediaItem: SeerMediaItem;

                            if (r.media?.title || r.media?.name) {
                                mediaItem = this.mapApiMediaItem(r.media, mediaType);
                            } else if (tmdbId) {
                                const details = await this.getMediaDetails(mediaType, Number(tmdbId));
                                if (details) {
                                    mediaItem = details;
                                } else {
                                    mediaItem = this.mapApiMediaItem(r.media || {}, mediaType);
                                }
                            } else {
                                mediaItem = this.mapApiMediaItem(r.media || {}, mediaType);
                            }

                            return {
                                id: r.id,
                                status: r.status,
                                createdAt: r.createdAt,
                                updatedAt: r.updatedAt,
                                type: mediaType,
                                is4k: Boolean(r.is4k),
                                serverId: r.serverId,
                                serverName: r.server?.name,
                                profileId: r.profileId,
                                profileName: r.profile?.name,
                                rootFolder: r.rootFolder,
                                media: mediaItem,
                                seasons: Array.isArray(r.seasons) ? r.seasons.map((s: any) => s.seasonNumber || s) : undefined,
                                requestedBy: {
                                    id: r.requestedBy?.id || 1,
                                    username: r.requestedBy?.username || 'User',
                                    avatar: r.requestedBy?.avatar
                                },
                                modifiedBy: r.modifiedBy ? {
                                    id: r.modifiedBy.id,
                                    username: r.modifiedBy.username
                                } : undefined
                            };
                        })
                    );

                    return enrichedRequests;
                }
            }
        } catch (e) {
            console.error('Failed to fetch requests from Seer', e);
        }
        return [];
    }


    public async createRequest(payload: CreateRequestPayload): Promise<SeerRequest> {
        const res = await this.request('/api/v1/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            return data;
        } else {
            const err = await res.json().catch(() => null);
            throw new Error(err?.message || `Failed to create request (HTTP ${res.status})`);
        }
    }

    public async approveRequest(requestId: number): Promise<boolean> {
        try {
            const res = await this.request(`/api/v1/request/${requestId}/approve`, {
                method: 'POST'
            });
            return res.ok;
        } catch (e) {
            console.error(`Failed to approve request #${requestId}`, e);
            return false;
        }
    }

    public async declineRequest(requestId: number): Promise<boolean> {
        try {
            const res = await this.request(`/api/v1/request/${requestId}/decline`, {
                method: 'POST'
            });
            return res.ok;
        } catch (e) {
            console.error(`Failed to decline request #${requestId}`, e);
            return false;
        }
    }

    public async deleteRequest(requestId: number): Promise<boolean> {
        try {
            const res = await this.request(`/api/v1/request/${requestId}`, {
                method: 'DELETE'
            });
            return res.ok;
        } catch (e) {
            console.error(`Failed to delete request #${requestId}`, e);
            return false;
        }
    }

    private mapApiMediaItem(item: any, forceType?: MediaType): SeerMediaItem {
        const mediaType = forceType || item.mediaType || (item.name || item.firstAirDate ? 'tv' : 'movie');

        let seasons: SeerSeason[] | undefined = undefined;
        if (Array.isArray(item.seasons)) {
            const mediaInfoSeasonsMap = new Map<number, number>();
            if (Array.isArray(item.mediaInfo?.seasons)) {
                for (const ms of item.mediaInfo.seasons) {
                    if (typeof ms.seasonNumber === 'number') {
                        mediaInfoSeasonsMap.set(ms.seasonNumber, ms.status);
                    }
                }
            }

            seasons = item.seasons.map((s: any) => ({
                id: s.id || s.seasonNumber,
                seasonNumber: s.seasonNumber,
                name: s.name || (s.seasonNumber === 0 ? 'Specials' : `Season ${s.seasonNumber}`),
                episodeCount: typeof s.episodeCount === 'number'
                    ? s.episodeCount
                    : (Array.isArray(s.episodes) ? s.episodes.length : 0),
                airDate: s.airDate,
                posterPath: s.posterPath
                    ? (s.posterPath.startsWith('http') ? s.posterPath : `https://image.tmdb.org/t/p/w500${s.posterPath}`)
                    : undefined,
                overview: s.overview,
                status: mediaInfoSeasonsMap.get(s.seasonNumber) ?? MediaStatus.UNKNOWN,
                episodes: Array.isArray(s.episodes) ? s.episodes.map((ep: any) => ({
                    id: ep.id,
                    episodeNumber: ep.episodeNumber,
                    name: ep.name || `Episode ${ep.episodeNumber}`,
                    airDate: ep.airDate,
                    overview: ep.overview,
                    status: ep.status
                })) : undefined
            }));

        }

        const rawPoster = item.posterPath || item.poster_path;
        const rawBackdrop = item.backdropPath || item.backdrop_path;
        const rawRelease = item.releaseDate || item.firstAirDate || item.release_date || item.first_air_date;

        return {
            id: item.id,
            mediaType,
            title: item.title || item.name || item.originalTitle || item.original_title || item.original_name || 'Unknown Title',
            overview: item.overview || '',
            posterPath: rawPoster
                ? (rawPoster.startsWith('http') ? rawPoster : `https://image.tmdb.org/t/p/w300${rawPoster}`)
                : '',
            backdropPath: rawBackdrop
                ? (rawBackdrop.startsWith('http') ? rawBackdrop : `https://image.tmdb.org/t/p/w1280${rawBackdrop}`)
                : undefined,
            releaseDate: rawRelease,
            voteAverage: typeof item.voteAverage === 'number' ? item.voteAverage : (typeof item.vote_average === 'number' ? item.vote_average : undefined),
            voteCount: typeof item.voteCount === 'number' ? item.voteCount : (typeof item.vote_count === 'number' ? item.vote_count : undefined),
            mediaInfo: item.mediaInfo,
            genres: Array.isArray(item.genres) ? item.genres.map((g: any) => g.name || g) : [],
            seasons
        };
    }

}

export const seerApi = new SeerApiService();
