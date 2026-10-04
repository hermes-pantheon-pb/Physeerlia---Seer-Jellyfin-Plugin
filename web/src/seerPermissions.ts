/**
 * Seer (Overseerr / Jellyseerr) bitmask permission flags
 * Matched strictly to Overseerr server/lib/permissions.ts
 */
export enum SeerPermission {
    NONE = 0,
    ADMIN = 2,
    MANAGE_USERS = 8,
    MANAGE_REQUESTS = 16,
    REQUEST = 32,
    VOTE = 64,
    AUTO_APPROVE = 128,
    AUTO_APPROVE_MOVIE = 256,
    AUTO_APPROVE_SERIES = 512,
    REQUEST_4K = 1024,
    REQUEST_4K_MOVIE = 2048,
    REQUEST_4K_SERIES = 4096,
    REQUEST_ADVANCED = 8192,
    REQUEST_VIEW = 16384,
    AUTO_APPROVE_4K = 32768,
    AUTO_APPROVE_4K_MOVIE = 65536,
    AUTO_APPROVE_4K_SERIES = 131072,
    REQUEST_MOVIE = 262144,
    REQUEST_SERIES = 524288,
    MANAGE_ISSUES = 1048576,
    VIEW_ISSUES = 2097152,
    CREATE_ISSUES = 4194304,
    AUTO_REQUEST = 8388608,
    AUTO_REQUEST_MOVIE = 16777216,
    AUTO_REQUEST_SERIES = 33554432,
    VIEW_RECENT = 67108864,
    WATCHLIST = 134217728
}

export function hasPermission(userPermissions: number, permission: SeerPermission): boolean {
    if ((userPermissions & SeerPermission.ADMIN) !== 0) {
        return true;
    }
    return (userPermissions & permission) !== 0;
}

export function canRequest(userPermissions: number, is4k: boolean = false): boolean {
    if ((userPermissions & SeerPermission.ADMIN) !== 0) {
        return true;
    }
    if (is4k) {
        return (userPermissions & SeerPermission.REQUEST_4K) !== 0 ||
               (userPermissions & SeerPermission.REQUEST_4K_MOVIE) !== 0 ||
               (userPermissions & SeerPermission.REQUEST_4K_SERIES) !== 0;
    }
    return (userPermissions & SeerPermission.REQUEST) !== 0 ||
           (userPermissions & SeerPermission.REQUEST_MOVIE) !== 0 ||
           (userPermissions & SeerPermission.REQUEST_SERIES) !== 0;
}

export function canAutoApprove(userPermissions: number, is4k: boolean = false): boolean {
    if ((userPermissions & SeerPermission.ADMIN) !== 0) {
        return true;
    }
    if (is4k) {
        return (userPermissions & SeerPermission.AUTO_APPROVE_4K) !== 0 ||
               (userPermissions & SeerPermission.AUTO_APPROVE_4K_MOVIE) !== 0 ||
               (userPermissions & SeerPermission.AUTO_APPROVE_4K_SERIES) !== 0;
    }
    return (userPermissions & SeerPermission.AUTO_APPROVE) !== 0 ||
           (userPermissions & SeerPermission.AUTO_APPROVE_MOVIE) !== 0 ||
           (userPermissions & SeerPermission.AUTO_APPROVE_SERIES) !== 0;
}

export function canManageRequests(userPermissions: number): boolean {
    return hasPermission(userPermissions, SeerPermission.MANAGE_REQUESTS);
}

export function canRequestAdvanced(userPermissions: number): boolean {
    return hasPermission(userPermissions, SeerPermission.REQUEST_ADVANCED);
}
