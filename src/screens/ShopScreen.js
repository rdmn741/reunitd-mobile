'use strict';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

const PRODUCTS = [
  {
    id: 'starter',
    name: 'Starter',
    badge: null,
    badgeBg: null,
    price: 19,
    patchCount: 1,
    desc: '1 iron-on NFC patch — perfect for trying it out.',
    features: [
      '1 NFC safety patch',
      'Lifetime free finder page',
      'Lost mode & alerts',
      'Machine washable',
    ],
    featured: false,
  },
  {
    id: 'family',
    name: 'Family',
    badge: '⭐ Most Popular',
    badgeBg: '#2563eb',
    price: 49,
    patchCount: 3,
    desc: '3 patches — one per child, one for the backpack.',
    features: [
      '3 NFC safety patches',
      'Lifetime free finder page',
      'Lost mode & alerts',
      'Machine washable',
      'Priority email support',
    ],
    featured: true,
  },
  {
    id: 'bundle',
    name: 'Bundle',
    badge: 'Best Value',
    badgeBg: '#16a34a',
    price: 69,
    patchCount: 5,
    desc: '5 patches — share with grandparents, school bag, and more.',
    features: [
      '5 NFC safety patches',
      'Lifetime free finder page',
      'Lost mode & alerts',
      'Machine washable',
      'Priority email support',
      'Free shipping',
    ],
    featured: false,
  },
];

function ProductCard({ product }) {
  function handleOrder() {
    Linking.openURL('https://reunitd.com/pricing').catch(() =>
      Alert.alert('Error', 'Could not open the store. Try visiting reunitd.com/pricing in your browser.')
    );
  }

  return (
    <View style={[styles.card, product.featured && styles.cardFeatured]}>
      {product.badge && (
        <View style={[styles.badge, { backgroundColor: product.badgeBg }]}>
          <Text style={styles.badgeText}>{product.badge}</Text>
        </View>
      )}

      <Text style={styles.cardName}>{product.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceCurrency}>$</Text>
        <Text style={[styles.priceAmount, product.featured && styles.priceAmountFeatured]}>
          {product.price}
        </Text>
      </View>
      <Text style={styles.patchCount}>
        {product.patchCount} patch{product.patchCount > 1 ? 'es' : ''}
      </Text>
      <Text style={styles.cardDesc}>{product.desc}</Text>

      <View style={styles.featureList}>
        {product.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} style={{ marginTop: 1 }} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.orderBtn, product.featured && styles.orderBtnFeatured]}
        onPress={handleOrder}
        activeOpacity={0.85}
      >
        <Text style={[styles.orderBtnText, product.featured && styles.orderBtnTextFeatured]}>
          Order {product.name} — ${product.price}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ShopScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Get More Patches</Text>
          <Text style={styles.subheading}>
            Iron-on NFC safety patches for the whole family. Works on any fabric.
          </Text>
        </View>

        {/* Trust strip */}
        <View style={styles.trustStrip}>
          {['Machine washable', 'No app to scan', 'Lifetime plan'].map((t) => (
            <View key={t} style={styles.trustItem}>
              <Ionicons name="checkmark" size={13} color={colors.success} />
              <Text style={styles.trustText}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Product cards */}
        {PRODUCTS.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}

        {/* FAQ link */}
        <TouchableOpacity
          style={styles.faqLink}
          onPress={() => Linking.openURL('https://reunitd.com/faq')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Text style={styles.faqLinkText}>Have questions? Visit our FAQ</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
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
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  trustDot: { color: '#16a34a', fontWeight: '700', fontSize: 13 },
  trustText: { fontSize: 11, color: '#374151', fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    padding: 22,
    marginBottom: 16,
    position: 'relative',
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

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  cardName: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#6b7280',
    marginBottom: 8,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  priceCurrency: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 8 },
  priceAmount: {
    fontSize: 52,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  priceAmountFeatured: { color: '#2563eb' },
  patchCount: { fontSize: 13, color: '#6b7280', fontWeight: '600', marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 19, marginBottom: 16 },

  featureList: { gap: 8, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { color: '#16a34a', fontWeight: '800', fontSize: 14, width: 16 },
  featureText: { fontSize: 13, color: '#374151', flex: 1 },

  orderBtn: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  orderBtnFeatured: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  orderBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  orderBtnTextFeatured: { color: '#fff' },

  faqLink: { alignItems: 'center', paddingVertical: 16 },
  faqLinkText: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
});
