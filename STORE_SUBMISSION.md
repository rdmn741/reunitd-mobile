# App Store & Google Play submission pack

Everything here is drafted from the actual data model and the published privacy
policy at <https://findally.us/privacy>. Where a declaration is a legal
statement about the company, it is marked **CONFIRM** — read it before you
submit it in your own name.

---

## 1. Hard blockers

| Item | Status |
|---|---|
| App icon 1024×1024 | ❌ **`assets/icon.png` is a 1×1 placeholder.** Same for adaptive-icon, splash, favicon. Nothing ships until these are real. |
| Apple Developer Program (organization) | ❌ needs a **D-U-N-S number** for reunItD Inc. — free, but 1–2 weeks. Start first. |
| Google Play Developer account | ❌ $25, ~1–3 days |
| APNs key (iOS push) + FCM (Android push) | ❌ code is ready, credentials are not |
| Screenshots | ❌ needs a working build |

Asset sizes needed:

- `icon.png` — 1024×1024, no transparency, no rounded corners (Apple rounds it)
- `adaptive-icon.png` — 1024×1024, keep the mark inside the middle 66% (Android masks it)
- `splash.png` — 1284×2778 works everywhere
- `favicon.png` — 48×48
- Google Play feature graphic — 1024×500
- Google Play icon — 512×512

---

## 2. Category and age rating

**Category:** Utilities, or Lifestyle. *Secondary:* Health & Fitness.

**Do not select the Kids Category.** Findally is used by guardians — adults —
not by children. The Kids Category imposes much stricter rules (no external
links, heavy restrictions on data collection) and mis-categorising an app that
merely *concerns* children is a common rejection. The app is *about* children;
it is not *for* children.

**Age rating:** 4+ / Everyone. There is no objectionable content. The rating
questionnaire asks about violence, language and so on — all "none".

---

## 3. Apple — App Privacy answers

For each: **Linked to the user? Yes.** **Used for tracking? No** for every
single item. Findally does not sell data, does not advertise, and has no
third-party ad or analytics SDK — so **App Tracking Transparency does not
apply** and you should not add the prompt.

| Data type | Collected | Purpose |
|---|---|---|
| **Contact Info → Name** | Yes | App Functionality |
| **Contact Info → Email Address** | Yes | App Functionality |
| **Contact Info → Phone Number** | Yes | App Functionality |
| **Contact Info → Physical Address** | Yes (optional) | App Functionality |
| **Health & Fitness → Health** | Yes — the emergency/medical note | App Functionality |
| **Location → Coarse Location** | Yes — derived from the scanning device's IP, never GPS | App Functionality |
| **User Content → Photos or Videos** | Yes — optional child photo | App Functionality |
| **User Content → Other User Content** | Yes — child name, tag labels | App Functionality |
| **Identifiers → User ID** | Yes | App Functionality |
| **Identifiers → Device ID** | Yes — push notification token | App Functionality |
| **Purchases → Purchase History** | Yes — shop orders | App Functionality |
| **Usage Data → Product Interaction** | Yes — scan events, and first-touch signup source | App Functionality, Analytics |

Notes worth having ready for a reviewer:

- **Health data**: the emergency/medical note is optional, entered by the
  guardian, and shown to a finder only when the guardian has enabled that field
  *and* turned Lost Mode on. Declaring it is the honest call — allergies and
  conditions are health data.
- **Location** is coarse and derived from the IP of whoever scans the tag. The
  NFC chip is passive: no battery, no GPS, no ability to report position.

---

## 4. Google Play — Data Safety answers

Mirrors the above. Additionally:

- **Is all data encrypted in transit?** — **Yes** (HTTPS throughout)
- **Can users request data deletion?** — **Yes**, both in-app (Profile →
  Delete Account) and by email to support@findally.us
- **Data deletion URL**: `https://findally.us/privacy` (section 7 and 9)
- **Does the app collect data from children?** — the account holder is an
  adult guardian; child information is entered *by* that adult. Answer the
  Families questions accordingly and do **not** opt into the Designed for
  Families programme.

---

## 5. Export compliance

`ITSAppUsesNonExemptEncryption: false` is now set in `app.json`.

**CONFIRM:** this is the standard answer for an app that uses only HTTPS/TLS and
the operating system's own keychain, which is what Findally does — the app itself
implements no custom cryptography. All the AES work happens server-side, outside
the shipped binary. If that ever changes, revisit this.

---

## 6. Review access — the step that gets apps rejected

A reviewer cannot tap a physical NFC patch, and the app needs an account. Give
them both, in App Review Notes:

```
Findally is used by parents and guardians. The physical product is an iron-on
NFC patch; a reviewer cannot scan one, so we have provided a demo account with
an activated tag and sample scan history.

Demo account
  Email:    <demo email>
  Password: <demo password>

This account is email-verified and has two-factor authentication switched off,
so sign-in requires no emailed code.

To see the finder experience — the page a stranger reaches when they tap a
patch — open https://findally.us/demo in any browser. It shows the full
step-by-step flow with sample data.

Please note: by default a scanned patch reveals NO personal information. The
guardian must turn on Lost Mode before any contact details are shown. This is
the core privacy behaviour of the product.
```

Create that account with `scripts/createDemoAccount.js` in the web repo.

---

## 7. Listing copy — draft

**App name:** Findally
**Subtitle (iOS, 30 chars):** `Tap-to-reunite NFC patches`
**Short description (Android, 80 chars):**
`Iron-on NFC patches that help a finder reach you if your child gets lost.`

**Keywords (iOS, 100 chars):**
`nfc,child safety,lost child,id tag,kids,parenting,emergency,patch,tracker,family,guardian,safety`

**Description:**

```
Findally is an iron-on NFC patch for your child's clothing or backpack. If they
ever get separated from you, anyone with a smartphone can tap the patch and
reach you — no app to download, no account to create on their side.

PRIVACY FIRST, BY DEFAULT
A patch reveals nothing at all until you say so. If someone taps it, you are
alerted immediately — but they see no name, no phone number, no address. You
decide, from your phone, whether to turn on Lost Mode and reveal the contact
details you have chosen to share.

YOU CHOOSE WHAT A FINDER SEES
Per patch, you decide whether to show your child's name, a phone number, an
address, or a medical note. Everything is off unless you turn it on.

INSTANT ALERTS
Get a push notification and an email the moment one of your patches is tapped,
including the approximate location of the scan.

NO BATTERY, NO GPS
The patch is completely passive. It cannot track anyone and does nothing at all
until a phone is held against it.

BUILT FOR SENSITIVE DATA
Names, phone numbers, addresses and medical notes are encrypted with a key
unique to your account. You can delete your account, and everything in it, at
any time from the app.

Findally is operated by reunItD Inc. Privacy policy: https://findally.us/privacy
```

**Support URL:** `https://findally.us/support`
**Marketing URL:** `https://findally.us`
**Privacy policy URL:** `https://findally.us/privacy`

---

## 8. Build commands

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios --latest
eas submit --platform android --latest
```

`eas.json` uses `appVersionSource: "local"` with `autoIncrement` on the
production profile, so `ios.buildNumber` and `android.versionCode` in
`app.json` are the source of truth and get bumped for you. They must increase
on every upload — the stores reject an identifier they have seen before, even
from a build that was rejected or never released.

---

## 9. Order of work

1. Real artwork, and start the D-U-N-S / developer account applications
2. First `preview` build; confirm it launches and push notifications arrive
3. Demo account + review notes
4. Screenshots from the working build
5. Privacy questionnaires (sections 3 and 4 above) and listing copy
6. Submit
7. React Navigation v7 — see `UPGRADE_NOTES.md`, needs a device to verify
