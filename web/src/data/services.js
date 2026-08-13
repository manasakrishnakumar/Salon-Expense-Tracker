// Shared category constants only — the actual service catalog (cost,
// products consumed, etc.) now lives on the backend as the single source
// of truth and is fetched via GET /api/services (see context/ServicesContext.jsx
// and ../../backend/src/data/servicesCatalog.js). Keeping these small,
// static labels here avoids a network round-trip just to render tab colors.

export const SERVICE_CATEGORIES = {
    FACIALS: 'facials',
    CLEANUPS: 'cleanups',
    PEDICURE_MANICURE: 'pedicure_manicure',
    HAIR_SERVICES: 'hair_services',
    OTHER: 'other',
};

export const CATEGORY_LABELS = {
    [SERVICE_CATEGORIES.FACIALS]: 'Facials',
    [SERVICE_CATEGORIES.CLEANUPS]: 'Cleanups',
    [SERVICE_CATEGORIES.PEDICURE_MANICURE]: 'Pedi/Mani',
    [SERVICE_CATEGORIES.HAIR_SERVICES]: 'Hair',
    [SERVICE_CATEGORIES.OTHER]: 'Other',
};
