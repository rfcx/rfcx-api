const admin = require("firebase-admin");

if (process.env.FIREBASE_CLIENT_EMAIL_RANGER_APP === '' || process.env.FIREBASE_CLIENT_EMAIL_RANGER_APP === undefined || process.env.FIREBASE_PRIVATE_KEY_RANGER_APP === '' || process.env.FIREBASE_PRIVATE_KEY_RANGER_APP === undefined) {
  console.log('Missing FIREBASE_CLIENT_EMAIL_RANGER_APP/FIREBASE_PRIVATE_KEY_RANGER_APP')
}
if (process.env.FIREBASE_CLIENT_EMAIL_PLAYER_APP === '' || process.env.FIREBASE_CLIENT_EMAIL_PLAYER_APP === undefined || process.env.FIREBASE_PRIVATE_KEY_PLAYER_APP === '' || process.env.FIREBASE_PRIVATE_KEY_PLAYER_APP === undefined) {
  console.log('Missing FIREBASE_CLIENT_EMAIL_PLAYER_APP/FIREBASE_PRIVATE_KEY_PLAYER_APP')
}

const rangerAppCert = admin.credential.cert({
  projectId: 'rfcx-ranger',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL_RANGER_APP,
  privateKey: `-----BEGIN PRIVATE KEY-----\n${process.env.FIREBASE_PRIVATE_KEY_RANGER_APP}\n-----END PRIVATE KEY-----\n`
});

const playerAppCert = admin.credential.cert({
  projectId: 'rfcx-stream',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL_PLAYER_APP,
  privateKey: `-----BEGIN PRIVATE KEY-----\n${process.env.FIREBASE_PRIVATE_KEY_PLAYER_APP}\n-----END PRIVATE KEY-----\n`
});

const rangerApp = admin.initializeApp({ credential: rangerAppCert }, 'rangerApp');
const playerApp = admin.initializeApp({ credential: playerAppCert }, 'playerApp');

module.exports = {
  rangerApp,
  playerApp,
}
