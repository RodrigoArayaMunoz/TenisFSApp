// Reuse the validated administrator access only during this app session.
// The key is never persisted in storage or included in a navigation URL.
let accessKey = null;

export const rememberAdminAccess = (key) => { accessKey = key; };
export const getAdminAccessKey = () => accessKey;
export const clearAdminAccess = () => { accessKey = null; };
