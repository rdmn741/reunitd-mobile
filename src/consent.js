// When a guardian must accept a visibility agreement — mirrors the server's
// config/consent.js, which enforces the same rules.
//
// One agreement per detail, accepted once per tag: when the detail is turned
// on, or the first time Privacy Mode goes off while it's on. The phone
// agreement is always part of that first switch: the finder page shows the
// guardian's name and primary number whenever Privacy Mode is off (the
// "Phone Numbers" toggle only covers the backup numbers).

export const CONSENT_FIELDS = ['childName', 'phones', 'address', 'emergencyNote', 'photo'];
const DEFAULT_ON = ['childName', 'phones', 'emergencyNote'];

export function isDetailOn(tag, field) {
  const vf = (tag && tag.visibleFields) || {};
  return DEFAULT_ON.includes(field) ? vf[field] !== false : vf[field] === true;
}

export function hasConsent(tag, field) {
  return !!(tag && tag.consents && tag.consents[field]);
}

export function consentsNeededForPrivacyOff(tag) {
  return CONSENT_FIELDS.filter((f) => (f === 'phones' || isDetailOn(tag, f)) && !hasConsent(tag, f));
}

export function needsConsentToEnable(tag, field) {
  return CONSENT_FIELDS.includes(field) && !hasConsent(tag, field);
}

// "your name and primary phone number, your child's name, …"
export function visibleDetailsText(tag) {
  const parts = ['your name and primary phone number'];
  if (isDetailOn(tag, 'childName'))     parts.push("your child's name");
  if (isDetailOn(tag, 'photo'))         parts.push("your child's photo");
  if (isDetailOn(tag, 'phones'))        parts.push('your backup phone numbers');
  if (isDetailOn(tag, 'emergencyNote')) parts.push('your emergency note');
  if (isDetailOn(tag, 'address'))       parts.push('your home address');
  return parts.join(', ');
}
