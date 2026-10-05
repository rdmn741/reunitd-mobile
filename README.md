# Findally Mobile

React Native + Expo (SDK 54) app for Findally — iron-on NFC safety patches.
Parents activate their patches, choose what a finder sees (Privacy Mode), and
get an alert when someone taps a patch.

## Prerequisites

- Node.js 20+
- An Expo account with access to the `robert741` EAS project
- For iOS builds on this Mac: Xcode (or build in the cloud with EAS)

The app uses native modules (camera + ML Kit text recognition for reading
activation and pack codes), so it does **not** run in Expo Go. Use a
development build instead.

## Setup

```bash
npm install
```

### API URL

`src/config.js` points at production:

```js
export const API_BASE_URL = 'https://findally.us';
```

To test against a local backend, use your machine's LAN IP (not `localhost` —
the app runs on a device or simulator that can't resolve it), e.g.
`http://192.168.1.109:3000`. Don't commit that change.

### Run a development build

```bash
# iOS simulator build in the cloud (no Xcode needed), then install it
eas build --profile development --platform ios

# Or locally, with Xcode installed
npx expo run:ios

# Then start the bundler
npx expo start --dev-client
```

## Push notifications

Push needs a physical device. On login the app asks for permission and
registers its Expo push token with the backend; it unregisters on logout.
Tap alerts open a quick-action sheet where the parent can turn Privacy Mode
off or change which details a finder sees.

## Project structure

```
App.js                    # Navigation, auth gate, push notification wiring
app.json                  # Expo config (name, bundle IDs, icons, plugins)
eas.json                  # EAS build profiles: development, preview, production
STORE_SUBMISSION.md       # App Store / Play submission pack
assets/                   # App icon, adaptive icon, splash, notification icon
src/
  config.js               # API base URL
  api.js                  # Every backend call (axios + JWT from SecureStore)
  AuthContext.js          # Session restore, login/logout, 2FA, email verification
  notifications.js        # Expo push helpers
  theme.js                # Design tokens
  screens/
    DashboardScreen.js    # Tag list, stats, activation (pack code or Tag ID + code)
    TagDetailScreen.js    # Privacy Mode, finder preview, visible fields, label
    ScanHistoryScreen.js  # Tap log for one tag
    NotificationsScreen.js
    ShopScreen.js         # Live prices/stock from /api/shop/catalog; waitlist
    ProfileScreen.js      # Account, children, security, help & legal links
    LoginScreen.js, RegisterScreen.js, ForgotPasswordScreen.js
  components/
    QuickActionSheet.js   # Shown when a finder taps a patch
    DisclaimerModal.js    # Consent before showing a sensitive field
    TagCard.js, AssignChildModal.js, ChildFormModal.js, ...
```

## Key design decisions

- **JWT** lives in `expo-secure-store`; a 401 clears it and returns to Login.
- **Privacy Mode** is on by default (`lostMode: false` on the server). Turning
  it off (`lostMode: true`) shows a finder the fields the parent enabled.
- **Sensitive fields** (photo, phones, address, emergency note) need the
  consent text from `/api/tags/disclaimers`, rendered verbatim.
- **Prices are never hard-coded for checkout** — the Shop screen reads the same
  tier list the web checkout charges, and purchases happen on findally.us.

## Building for release

```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

See `STORE_SUBMISSION.md` for listing copy, privacy answers, and review notes.

The EAS slug is still `reunitd-mobile`: the build project is linked to it, and
renaming the slug means creating a new EAS project. Users never see the slug.
