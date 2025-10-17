import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import { getUserByUsername, getCredsForUser, insertCredential, getCredById, updateCounter } from './db.js';

const expectedRPID = process.env.RP_ID;
const expectedOrigin = process.env.RP_ORIGIN;

export function startRegistration(session) {
  const admin = getUserByUsername.get('admin');
  const existingCreds = getCredsForUser.all(admin.id);
  const options = generateRegistrationOptions({
    rpName: 'Secure Dashboard',
    rpID: expectedRPID,
    userID: String(admin.id),
    userName: 'admin',
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
      authenticatorAttachment: 'platform'
    },
    excludeCredentials: existingCreds.map(c => ({ id: Buffer.from(c.credId, 'base64url'), type: 'public-key' }))
  });
  session.currentChallenge = options.challenge;
  return options;
}

export async function finishRegistration(session, response) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: session.currentChallenge,
    expectedOrigin,
    expectedRPID
  });
  const { verified, registrationInfo } = verification;
  if (verified && registrationInfo) {
    const { credentialID, credentialPublicKey, counter } = registrationInfo;
    insertCredential.run(1, credentialID.toString('base64url'), credentialPublicKey.toString('base64url'), counter, JSON.stringify([]));
  }
  return { verified };
}

export function startAuthentication(session) {
  const admin = getUserByUsername.get('admin');
  const creds = getCredsForUser.all(admin.id);
  const allowCredentials = creds.map(c => ({ id: Buffer.from(c.credId, 'base64url'), type: 'public-key' }));
  const options = generateAuthenticationOptions({
    rpID: expectedRPID,
    userVerification: 'required',
    allowCredentials
  });
  session.currentChallenge = options.challenge;
  return options;
}

export async function finishAuthentication(session, response) {
  const dbCred = getCredById.get(response.rawId);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: session.currentChallenge,
    expectedOrigin,
    expectedRPID,
    authenticator: dbCred ? {
      credentialID: Buffer.from(dbCred.credId, 'base64url'),
      credentialPublicKey: Buffer.from(dbCred.publicKey, 'base64url'),
      counter: dbCred.counter,
      transports: JSON.parse(dbCred.transports || '[]')
    } : undefined
  });
  const { verified, authenticationInfo } = verification;
  if (verified) {
    updateCounter.run(authenticationInfo.newCounter, dbCred.id);
    session.userId = 1;
    session.role = 'admin';
  }
  return { verified };
}
