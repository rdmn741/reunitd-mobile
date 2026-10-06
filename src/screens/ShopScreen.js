'use strict';
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { getShopCatalog, joinWaitlist, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';

const PRICING_URL  = 'https://findally.us/pricing';
const WARRANTY_URL = 'https://findally.us/warranty';
const FAQ_URL      = 'https://findally.us/faq';

// Shown until GET /api/shop/catalog answers, or if it can't be reached. The
// server's list is built from the same tiers checkout charges and replaces
// this on load — keep it in step with SHOP_TIERS in the web repo's
// config/stripe.js so a stale copy is never what people see for long.
const FALLBACK_CATALOG = {
  tiers: [
    { id: 'starter', label: 'Starter',     priceCents: 1499, tagCount: 1, inStock: false, assorted: false, note: null },
    { id: 'family',  label: 'Family Pack', priceCents: 3499, tagCount: 3, inStock: false, assorted: true,  note: null },
    { id: 'bundle',  label: 'Bundle',      priceCents: 4999, tagCount: 7, inStock: false, assorted: true,
      note: 'One of the 7 patches comes in a surprise design.' },
  ],
  designs: [{ id: 'dino', name: 'Dinosaur' }, { id: 'bear', name: 'Bear' }, { id: 'rocket', name: 'Rocket' }],
  shipping: { standardCents: 299, freeOverCents: 2500, countries: ['US', 'CA'] },
};

// Copy only. Prices, patch counts and stock always come from the catalog.
const TIER_BLURB = {
  starter: 'One patch — a good way to try it out.',
  family:  'One per child, or one for the backpack.',
  bundle:  'Enough to share with grandparents, the school bag, and more.',
};

const COUNTRY_NAMES = { US: 'the US', CA: 'Canada' };
const WAITLIST_LANGS = ['en', 'es', 'fr', 'pt', 'zh', 'ar'];

// Waitlist emails go out in the device language when the site supports it.
function deviceLang() {
  try {
    const lang = (Intl.DateTimeFormat().resolvedOptions().locale || '').slice(0, 2).toLowerCase();
    return WAITLIST_LANGS.includes(lang) ? lang : 'en';
  } catch (e) {
    return 'en';
  }
}

function money(cents) {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

function listNames(names, joiner) {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${joiner} ${names[names.length - 1]}`;
}

function openUrl(url) {
  Linking.openURL(url).catch(() =>
    Alert.alert('Could not open the page', `Visit ${url.replace('https://', '')} in your browser.`)
  );
}

function TierCard({ tier, designs, shipping, featured }) {
  const whole = Math.floor(tier.priceCents / 100);
  const cents = String(tier.priceCents % 100).padStart(2, '0');
  const designNames = designs.map((d) => d.name);
  const freeShipping = tier.priceCents >= shipping.freeOverCents;

  const features = [
    `${tier.tagCount} NFC patch${tier.tagCount === 1 ? '' : 'es'}`,
    tier.assorted
      ? `Mix of designs: ${listNames(designNames, 'and')}`
      : `Pick your design: ${listNames(designNames, 'or')}`,
    tier.note,
    freeShipping ? 'Free shipping' : `+ ${money(shipping.standardCents)} shipping`,
  ].filter(Boolean);

  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardName}>{tier.label}</Text>
        {featured && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Best value</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceCurrency}>$</Text>
        <Text style={[styles.priceAmount, featured && styles.priceAmountFeatured]}>{whole}</Text>
        <Text style={styles.priceCents}>.{cents}</Text>
      </View>
      {tier.tagCount > 1 && (
        <Text style={styles.perPatch}>About {money(Math.round(tier.priceCents / tier.tagCount))} per patch</Text>
      )}
      {TIER_BLURB[tier.id] ? <Text style={styles.cardDesc}>{TIER_BLURB[tier.id]}</Text> : null}

      <View style={styles.featureList}>
        {features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {tier.inStock ? (
        <TouchableOpacity
          style={[styles.orderBtn, featured && styles.orderBtnFeatured]}
          onPress={() => openUrl(PRICING_URL)}
          activeOpacity={0.85}
        >
          <View style={styles.btnInner}>
            <Text style={[styles.orderBtnText, featured && styles.orderBtnTextFeatured]}>
              Order on findally.us
            </Text>
            <Ionicons name="open-outline" size={15} color={featured ? '#fff' : colors.text} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.soldOut}>
          <Text style={styles.soldOutText}>Out of stock</Text>
        </View>
      )}
    </View>
  );
}

export default function ShopScreen() {
  const { parent } = useAuth();
  const [catalog, setCatalog] = useState(FALLBACK_CATALOG);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Refetch on every visit so stock and prices follow the store without an
  // app update. A failed fetch keeps whatever is already on screen.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      getShopCatalog()
        .then((data) => {
          if (live && data && Array.isArray(data.tiers) && data.tiers.length) {
            setCatalog({
              tiers: data.tiers,
              designs: data.designs || FALLBACK_CATALOG.designs,
              shipping: data.shipping || FALLBACK_CATALOG.shipping,
            });
          }
        })
        .catch(() => {});
      return () => { live = false; };
    }, [])
  );

  const { tiers, designs, shipping } = catalog;
  const anyInStock = tiers.some((t) => t.inStock);
  const countries = listNames((shipping.countries || []).map((c) => COUNTRY_NAMES[c] || c), '&');

  // "Best value" goes to the lowest price per patch — a claim the numbers prove.
  const bestValueId = tiers.length > 1
    ? tiers.reduce((best, t) => (t.priceCents / t.tagCount < best.priceCents / best.tagCount ? t : best)).id
    : null;

  async function handleJoinWaitlist() {
    if (!parent?.email) {
      openUrl(PRICING_URL);
      return;
    }
    setJoining(true);
    try {
      await joinWaitlist(parent.email, deviceLang());
      setJoined(true);
    } catch (err) {
      Alert.alert('Could not sign you up', getErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>Get More Patches</Text>
          <Text style={styles.subheading}>
            Iron-on NFC safety patches. Pay once — your account and dashboard are free.
          </Text>
        </View>

        <View style={styles.trustStrip}>
          {['No subscription', 'No app for finders', '30-day returns'].map((t) => (
            <View key={t} style={styles.trustItem}>
              <Ionicons name="checkmark" size={13} color={colors.success} />
              <Text style={styles.trustText}>{t}</Text>
            </View>
          ))}
        </View>

        {!anyInStock && (
          <View style={styles.waitCard}>
            {joined ? (
              <View style={styles.waitDoneRow}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={styles.waitDoneText}>
                  You're on the list. We'll email {parent?.email} when patches are available.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.waitTitle}>Not on sale yet</Text>
                <Text style={styles.waitBody}>
                  The first patches are on their way. Get an email the day they're available.
                </Text>
                <TouchableOpacity
                  style={[styles.waitBtn, joining && { opacity: 0.6 }]}
                  onPress={handleJoinWaitlist}
                  disabled={joining}
                  activeOpacity={0.85}
                >
                  {joining ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={styles.btnInner}>
                      <Ionicons name="mail-outline" size={17} color="#fff" />
                      <Text style={styles.waitBtnText}>Email me when they're available</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {tiers.map((t) => (
          <TierCard key={t.id} tier={t} designs={designs} shipping={shipping} featured={t.id === bestValueId} />
        ))}

        <View style={styles.policyCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.policyText}>
            Free shipping on orders of {money(shipping.freeOverCents)} or more. Ships to {countries}.
            Return unused patches within 30 days; every chip has a 1-year warranty.
          </Text>
        </View>

        <TouchableOpacity style={styles.footLink} onPress={() => openUrl(WARRANTY_URL)}>
          <Text style={styles.footLinkText}>Warranty & returns</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.footLink} onPress={() => openUrl(FAQ_URL)}>
          <Text style={styles.footLinkText}>Have questions? Visit our FAQ</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  header: { paddingTop: 24, marginBottom: 16 },
  heading: { fontSize: 26, fontWeight: '900', color: '#1e3a8a', letterSpacing: -0.5 },
  subheading: { fontSize: 14, color: '#6b7280', marginTop: 4, lineHeight: 20 },

  trustStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  trustText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  waitCard: {
    backgroundColor: colors.primaryFaint,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  waitTitle: { fontSize: 17, fontWeight: '800', color: '#1e3a8a' },
  waitBody: { fontSize: 13, color: '#475569', lineHeight: 19, marginTop: 4, marginBottom: 14 },
  waitBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  waitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  waitDoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitDoneText: { flex: 1, fontSize: 14, color: '#14532d', fontWeight: '600', lineHeight: 20 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardFeatured: {
    borderColor: '#2563eb',
    borderWidth: 2,
    shadowColor: '#2563eb',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardName: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
  },
  badge: { backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  priceCurrency: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 8 },
  priceAmount: { fontSize: 52, fontWeight: '900', color: '#111827', letterSpacing: -1.5, lineHeight: 58 },
  priceAmountFeatured: { color: '#2563eb' },
  priceCents: { fontSize: 20, fontWeight: '800', color: '#374151', marginTop: 8 },
  perPatch: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginTop: 2 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginTop: 8, marginBottom: 14 },

  featureList: { gap: 8, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 13, color: '#374151', flex: 1 },

  orderBtn: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  orderBtnFeatured: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  orderBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  orderBtnTextFeatured: { color: '#fff' },
  soldOut: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  soldOutText: { fontSize: 14, fontWeight: '700', color: '#9ca3af' },

  policyCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  policyText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 19 },

  footLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  footLinkText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
