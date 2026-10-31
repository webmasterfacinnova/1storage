# Plan: Standardize OAuth redirect scheme to `onestorage`

## Goal
Replace the inverted Android client ID custom scheme (`com.googleusercontent.apps.xxx`) with the app's own `onestorage` scheme for the Android OAuth redirect URI. This simplifies configuration and avoids registering Google-specific schemes in the app manifest.

## Changes

### 1. `app.config.js`
- Remove the `invertedAndroidScheme` computation (lines 20-25).
- Revert `expo.scheme` from an array back to a plain string `"onestorage"`.

### 2. `services/auth/google-auth.service.ts`
- In `buildRedirectUri()`, change the Android branch from constructing the inverted client ID URI to using `makeRedirectUri({ scheme: "onestorage", path: "oauthredirect" })`.
- Remove the `invertedScheme` derivation logic and its guard — the scheme is now static.
- Keep the existing defensive guard in `signIn()` that checks `Platform.OS === "android" && !this.androidClientId`.

### 3. Google Cloud Console (manual step — no code change)
- Add `onestorage:/oauthredirect` as an **Authorized redirect URI** for the Android OAuth 2.0 Client ID in Google Cloud Console.

## Files modified
1. `app.config.js`
2. `services/auth/google-auth.service.ts`

## Validation
1. `npx tsc --noEmit` — no type errors.
2. `npm run lint` — no lint errors.
3. On Android: `buildRedirectUri()` returns `onestorage:/oauthredirect`.
4. On web: `buildRedirectUri()` returns `makeRedirectUri({ preferLocalhost: true })`.
5. On iOS: `buildRedirectUri()` returns `makeRedirectUri()`.
6. `expo.scheme` is the plain string `"onestorage"`.
