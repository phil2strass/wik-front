export const environment = {
    production: false,
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
