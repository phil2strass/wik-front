export const environment = {
    production: true,
    apiUrl: 'https://www.wordsiknow.com/api/',
    basePhotoUrl: 'https://www.wordsiknow.com/images/',
    // Keep silent SSO in prod by default
    enableSilentSSO: true,
    keycloak: {
        url: 'https://alma.htpweb.fr/',
        realm: 'wik',
        clientId: 'myclient'
    }
};
