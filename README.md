# SafeTag Mobile

React Native + Expo mobile app for the SafeTag NFC child safety tag system.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your iOS or Android device (for development)

## Setup

### 1. Install dependencies

```bash
cd safetag-mobile
npm install
```

### 2. Configure the API URL

Open `src/config.js` and set your backend server address:

```js
export const API_BASE_URL = 'http://YOUR_SERVER_IP:3000';
```

**Important:** Use your machine's local IP address (e.g. `192.168.1.109`), NOT `localhost` — React Native runs on a physical device and cannot resolve `localhost` to your development machine.

To find your local IP:
- **Mac:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** `ipconfig` → look for "IPv4 Address"
- **Linux:** `hostname -I`

### 3. Asset placeholders

The `app.json` references some image assets. For development you can generate simple placeholder images:

```bash
# Install the expo asset generator or use any 1024x1024 PNG as icon.png
# The app will run fine without them in Expo Go
```

Or just remove the icon/splash fields from `app.json` for initial testing.

### 4. Start the development server

```bash
npx expo start
```

Then:
- Scan the QR code with **Expo Go** (Android) or the Camera app (iOS)
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator (Mac only)

## Push Notifications

Push notifications require a **physical device** (not simulator/emulator).

The app will:
1. Request notification permission on first login
2. Register the Expo push token with your backend
3. Display incoming scan alerts when the app is open or in background

## Project Structure

```
safetag-mobile/
├── App.js                  # Root component, navigation setup, push notification setup
├── app.json                # Expo configuration
├── babel.config.js         # Babel config
├── package.json            # Dependencies
└── src/
    ├── config.js           # API base URL (change this!)
    ├── api.js              # All backend API calls (axios)
    ├── AuthContext.js      # Auth state management (login/logout/session restore)
    ├── notifications.js    # Expo push notification helpers
    ├── screens/
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   ├── ForgotPasswordScreen.js
    │   ├── DashboardScreen.js      # Tag list + stats + activate modal
    │   ├── TagDetailScreen.js      # Lost mode, field visibility, label
    │   ├── ScanHistoryScreen.js    # Scan log for one tag
    │   ├── NotificationsScreen.js  # All scans across all tags
    │   └── ProfileScreen.js        # Account info + edit + logout
    └── components/
        ├── DisclaimerModal.js  # Privacy disclaimer before enabling sensitive fields
        └── TagCard.js          # Tag list item card
```

## Key Design Decisions

- **JWT** stored in `expo-secure-store` (encrypted on device)
- **401 responses** automatically clear the token and redirect to Login
- **Sensitive fields** (phones, address, emergency note) require accepting a privacy disclaimer before being enabled on a tag's public scan page
- **Push token** is registered on login and unregistered on logout
- All screens have pull-to-refresh and loading states

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Configure your project (first time)
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

Update the `projectId` in `app.json` → `extra.eas.projectId` with your EAS project ID.

## Changing the API URL for Production

In `src/config.js`:

```js
export const API_BASE_URL = 'https://api.yourdomain.com';
```
