import React, { useState } from 'react';
import { Alert } from 'react-native';
import { setLostMode, agreementRequired, getErrorMessage } from './api';
import { consentsNeededForPrivacyOff, visibleDetailsText } from './consent';
import DisclaimerModal, { syncDisclaimerVersion } from './components/DisclaimerModal';

/**
 * Privacy Mode on/off for one tag, the same way everywhere in the app.
 *
 * Turning it on is immediate. Turning it off the first time on a tag walks
 * through the agreement for each detail a finder would see — accepting those
 * is the confirmation. After that it's a single "Turn Privacy Mode off?"
 * prompt listing what finders will see. If the server still asks for an
 * agreement (the tag changed elsewhere, or the wording was updated), the
 * missing ones are shown and the switch retried.
 *
 * Render `modal` somewhere in the component; call `toggle()` from the switch.
 *
 * @param {Object|null} tag       Current tag (may be null while loading)
 * @param {Function}    onChange  Receives { lostMode, consents } after a change
 */
export default function usePrivacySwitch(tag, onChange) {
  const [busy, setBusy] = useState(false);
  // { fields: [...], index, accepted: [fields accepted at the shown version] }
  const [flow, setFlow] = useState(null);

  async function apply(lostMode, agree) {
    if (!tag) return;
    setBusy(true);
    try {
      const data = await setLostMode(tag.tagId, lostMode, agree);
      onChange({ lostMode: data.lostMode, ...(data.consents ? { consents: data.consents } : {}) });
    } catch (err) {
      const need = agreementRequired(err);
      if (need && need.fields.length) {
        // A version mismatch puts every sent field back in `fields`, so what
        // survives here was accepted at the current wording.
        const stillValid = Object.keys(agree || {}).filter((f) => !need.fields.includes(f));
        syncDisclaimerVersion(need.version);
        setFlow({ fields: need.fields, index: 0, accepted: stillValid });
      } else {
        Alert.alert('Error', getErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  function turnOff() {
    if (!tag || busy) return;
    const needed = consentsNeededForPrivacyOff(tag);
    if (needed.length) {
      setFlow({ fields: needed, index: 0, accepted: [] });
      return;
    }
    Alert.alert(
      'Turn Privacy Mode off?',
      `Anyone who taps ${tag.label ? `"${tag.label}"` : 'this tag'} will see ${visibleDetailsText(tag)}.\n\n`
        + 'You can turn Privacy Mode back on at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Show My Info', style: 'destructive', onPress: () => apply(true) },
      ]
    );
  }

  function turnOn() {
    if (!tag || busy) return;
    apply(false);
  }

  function toggle() {
    if (!tag) return;
    if (tag.lostMode) turnOn();
    else turnOff();
  }

  function handleAgree(version) {
    if (!flow) return;
    const field = flow.fields[flow.index];
    const accepted = [...flow.accepted, field];
    if (flow.index + 1 < flow.fields.length) {
      setFlow({ ...flow, index: flow.index + 1, accepted });
      return;
    }
    setFlow(null);
    const agree = {};
    accepted.forEach((f) => { agree[f] = version; });
    apply(true, agree);
  }

  const isLast = flow && flow.index + 1 === flow.fields.length;
  const modal = flow ? (
    <DisclaimerModal
      visible
      fieldName={flow.fields[flow.index]}
      mode="privacyOff"
      step={flow.fields.length > 1 ? `${flow.index + 1} of ${flow.fields.length}` : null}
      agreeLabel={isLast ? 'I Agree — Show My Info' : 'I Agree — Next'}
      onAgree={handleAgree}
      onCancel={() => setFlow(null)}
    />
  ) : null;

  return { busy, toggle, turnOff, turnOn, modal };
}
