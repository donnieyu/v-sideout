import type {AuthPolicy} from './accounts';

export const AUTH_POLICY:Readonly<AuthPolicy>=Object.freeze({
 minPasswordLength:8,
 temporaryCredentialDays:7,
});

export const SESSION_SECONDS=12*60*60;
