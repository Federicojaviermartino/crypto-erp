/**
 * OAuth 2.0 Scopes Definition
 * Defines all available scopes for third-party API access
 *
 * Scope naming convention: <resource>:<action>
 * - resource: invoices, contacts, crypto, accounting, analytics, etc.
 * - action: read, write, delete
 *
 * Usage in OAuth apps:
 * - Apps request scopes during authorization
 * - Users grant permissions to apps
 * - API endpoints require specific scopes via @RequireScopes() decorator
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get OAUTH_SCOPES () {
        return OAUTH_SCOPES;
    },
    get SCOPE_DESCRIPTIONS () {
        return SCOPE_DESCRIPTIONS;
    },
    get SCOPE_GROUPS () {
        return SCOPE_GROUPS;
    },
    get checkScope () {
        return checkScope;
    },
    get getAllScopes () {
        return getAllScopes;
    },
    get isValidScope () {
        return isValidScope;
    }
});
const OAUTH_SCOPES = {
    // Invoice scopes
    INVOICES_READ: 'invoices:read',
    INVOICES_WRITE: 'invoices:write',
    INVOICES_DELETE: 'invoices:delete',
    // Contact scopes
    CONTACTS_READ: 'contacts:read',
    CONTACTS_WRITE: 'contacts:write',
    CONTACTS_DELETE: 'contacts:delete',
    // Crypto scopes
    CRYPTO_READ: 'crypto:read',
    CRYPTO_WRITE: 'crypto:write',
    // Accounting scopes
    ACCOUNTING_READ: 'accounting:read',
    ACCOUNTING_WRITE: 'accounting:write',
    // Analytics scopes
    ANALYTICS_READ: 'analytics:read',
    // Company scopes
    COMPANY_READ: 'company:read',
    COMPANY_WRITE: 'company:write',
    // User scopes
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    // Webhooks scopes
    WEBHOOKS_READ: 'webhooks:read',
    WEBHOOKS_WRITE: 'webhooks:write',
    // Full access (dangerous - requires explicit user consent)
    FULL_ACCESS: '*'
};
const SCOPE_DESCRIPTIONS = {
    [OAUTH_SCOPES.INVOICES_READ]: 'Read invoices and their details',
    [OAUTH_SCOPES.INVOICES_WRITE]: 'Create and update invoices',
    [OAUTH_SCOPES.INVOICES_DELETE]: 'Delete invoices',
    [OAUTH_SCOPES.CONTACTS_READ]: 'Read customer and supplier contacts',
    [OAUTH_SCOPES.CONTACTS_WRITE]: 'Create and update contacts',
    [OAUTH_SCOPES.CONTACTS_DELETE]: 'Delete contacts',
    [OAUTH_SCOPES.CRYPTO_READ]: 'Read cryptocurrency wallets and transactions',
    [OAUTH_SCOPES.CRYPTO_WRITE]: 'Create and update crypto transactions',
    [OAUTH_SCOPES.ACCOUNTING_READ]: 'Read accounting data (journal entries, accounts)',
    [OAUTH_SCOPES.ACCOUNTING_WRITE]: 'Create and update journal entries',
    [OAUTH_SCOPES.ANALYTICS_READ]: 'Read analytics and reports',
    [OAUTH_SCOPES.COMPANY_READ]: 'Read company information and settings',
    [OAUTH_SCOPES.COMPANY_WRITE]: 'Update company information and settings',
    [OAUTH_SCOPES.USERS_READ]: 'Read user information',
    [OAUTH_SCOPES.USERS_WRITE]: 'Manage users and permissions',
    [OAUTH_SCOPES.WEBHOOKS_READ]: 'Read webhook subscriptions',
    [OAUTH_SCOPES.WEBHOOKS_WRITE]: 'Create and manage webhook subscriptions',
    [OAUTH_SCOPES.FULL_ACCESS]: 'Full access to all resources (requires explicit consent)'
};
const SCOPE_GROUPS = {
    INVOICING: [
        OAUTH_SCOPES.INVOICES_READ,
        OAUTH_SCOPES.INVOICES_WRITE,
        OAUTH_SCOPES.CONTACTS_READ
    ],
    ACCOUNTING: [
        OAUTH_SCOPES.ACCOUNTING_READ,
        OAUTH_SCOPES.ACCOUNTING_WRITE,
        OAUTH_SCOPES.INVOICES_READ
    ],
    CRYPTO_PORTFOLIO: [
        OAUTH_SCOPES.CRYPTO_READ,
        OAUTH_SCOPES.CRYPTO_WRITE
    ],
    REPORTING: [
        OAUTH_SCOPES.ANALYTICS_READ,
        OAUTH_SCOPES.INVOICES_READ,
        OAUTH_SCOPES.ACCOUNTING_READ
    ],
    READ_ONLY: [
        OAUTH_SCOPES.INVOICES_READ,
        OAUTH_SCOPES.CONTACTS_READ,
        OAUTH_SCOPES.CRYPTO_READ,
        OAUTH_SCOPES.ACCOUNTING_READ,
        OAUTH_SCOPES.ANALYTICS_READ,
        OAUTH_SCOPES.COMPANY_READ
    ]
};
function checkScope(grantedScopes, requiredScope) {
    // Check for full access wildcard
    if (grantedScopes.includes(OAUTH_SCOPES.FULL_ACCESS)) {
        return true;
    }
    // Check for exact match
    if (grantedScopes.includes(requiredScope)) {
        return true;
    }
    // Check for wildcard within resource (e.g., "invoices:*")
    const [resource] = requiredScope.split(':');
    if (grantedScopes.includes(`${resource}:*`)) {
        return true;
    }
    return false;
}
function isValidScope(scope) {
    if (scope === OAUTH_SCOPES.FULL_ACCESS) {
        return true;
    }
    const parts = scope.split(':');
    if (parts.length !== 2) {
        return false;
    }
    const [resource, action] = parts;
    const validActions = [
        'read',
        'write',
        'delete',
        '*'
    ];
    return resource.length > 0 && validActions.includes(action);
}
function getAllScopes() {
    return Object.values(OAUTH_SCOPES);
}

//# sourceMappingURL=scopes.js.map