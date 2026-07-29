# React Navigation v6 → v7

**Status: assessed, deliberately not done.** Not because it looks difficult —
because it cannot be verified from a machine with no iOS simulator, and a broken
navigator means the app does not start at all.

Do this when you can run the app in Expo Go and tap through every screen.

## Why it looks low risk

The app uses a small, conventional slice of the API:

| Used | Count |
|---|---|
| `navigation.navigate` | 6 |
| `navigation.goBack` | 3 |
| `NavigationContainer` | 3 |
| `screenOptions` / `headerShown` | 3 each |
| `createNativeStackNavigator` / `createBottomTabNavigator` | 2 each |
| `tabBarIcon` | 1 |

None of these changed shape in v7. There is no `tabBarOptions` (removed back in
v6) and no deep linking config, no custom navigators, no `navigationRef`
gymnastics — the usual sources of upgrade pain are all absent.

The peer dependencies are already v7-compatible:

- `react-native-screens` 4.16 (v7 needs ≥ 4.0) ✅
- `react-native-safe-area-context` 5.6 (v7 needs ≥ 4.0) ✅
- React 19.1 / RN 0.81 ✅

## What the upgrade is

```bash
npx expo install @react-navigation/native@^7 \
                 @react-navigation/native-stack@^7 \
                 @react-navigation/bottom-tabs@^7
```

Then run the app and check, in this order:

1. It boots at all (a v7/v6 package mix fails here — all three must move together)
2. Tab bar renders with its icons
3. Every `navigate` target opens: tag detail, scan history, notifications, profile, shop
4. Back navigation and the header back button
5. The auth flow — login → 2FA/verify → dashboard, and logout returning to login

## Why it is not urgent

v6 is not deprecated and neither store requires v7. There is no compliance
reason to move, so it should happen on a day when a regression is cheap — not
in the run-up to a submission.

## The real ordering

Do these first; they are the ones that block or endanger a release:

1. ~~In-app account deletion~~ — done, App Store Guideline 5.1.1(v)
2. ~~Disclaimer text served from the server~~ — done
3. ~~Privacy/Lost Mode wording~~ — done
4. ~~Privacy policy URL~~ — done
5. Navigation v7 — this document
