const admin = require("firebase-admin");

const rangerAppCert = admin.credential.cert({
  projectId: 'rfcx-ranger',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL_RANGER_APP,
  privateKey: process.env.FIREBASE_PRIVATE_KEY_RANGER_APP
});

const playerAppCert = admin.credential.cert({
  projectId: 'rfcx-stream',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL_PLAYER_APP,
  privateKey: process.env.FIREBASE_PRIVATE_KEY_PLAYER_APP
});

const rangerApp = admin.initializeApp({ credential: rangerAppCert }, 'rangerApp');
const playerApp = admin.initializeApp({ credential: playerAppCert }, 'playerApp');

module.exports = {
  rangerApp,
  playerApp,
}
