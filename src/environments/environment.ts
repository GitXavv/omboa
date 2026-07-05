// window.location.hostname : permet d'utiliser la même IP que celle utilisée
// pour charger la page Angular (localhost en local, IP LAN via `ng serve --host 0.0.0.0`).
const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  apiUrl:  `http://${apiHost}:5272/api`,
  hubUrl:  `http://${apiHost}:5272/hubs`
};
