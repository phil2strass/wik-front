export const environment = {
    production: false,
    apiUrl: 'http://localhost:8086/',
    basePhotoUrl: 'http://localhost:8086/images/',
    // Disable silent SSO in dev to avoid hidden iframe sandbox concerns
    enableSilentSSO: false,
    keycloak: {
        url: 'https://almadev.htpweb.fr/',
        realm: 'wik',
        clientId: 'myclient'
    }
};
