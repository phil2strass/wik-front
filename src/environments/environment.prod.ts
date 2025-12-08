export const environment = {
    production: true,
    apiUrl: 'https://wordsiknow.com/api/',
    basePhotoUrl: 'https://wordsiknow.com/images/',
    // Keep silent SSO in prod by default
    enableSilentSSO: true,
    keycloak: {
        url: 'https://alma.htpweb.fr/',
        realm: 'wik',
        clientId: 'wik-admin'
    }
};
