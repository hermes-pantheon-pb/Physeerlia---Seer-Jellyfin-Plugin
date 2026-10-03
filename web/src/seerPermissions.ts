/**
 * Seer bitmask permission flags
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
    AUTO_APPROVE_MUSIC = 1024,
    REQUEST_4K = 2048,
    REQUEST_4K_MOVIE = 4096,
    REQUEST_4K_SERIES = 8192,
    AUTO_APPROVE_4K = 16384,
    AUTO_APPROVE_4K_MOVIE = 32768,
    AUTO_APPROVE_4K_SERIES = 65536,
    REQUEST_ADVANCED = 131072,
    VIEW_RECENT = 262144,
    MANAGE_SETTINGS = 524288,
    WATCHLIST = 1048576
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
    return (userPermissions & SeerPermission.REQUEST) !== 0;
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
