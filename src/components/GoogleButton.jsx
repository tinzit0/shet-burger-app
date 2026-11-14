import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { signInWithGoogle } from '../lib/auth';
import { colors, fonts } from '../lib/theme';

// Botón "Continuar con Google": blanco con la G, como pide la guía de marca de Google.
export function GoogleButton({ label = 'Continuar con Google', onDone }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const press = async () => {
    setBusy(true); setError('');
    try { const session = await signInWithGoogle(); if (session) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); onDone?.(session); } }
    catch (e) { setError(e.message || 'No se pudo iniciar sesión con Google.'); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 8 }}>
    <Pressable onPress={press} disabled={busy} accessibilityRole="button" style={({ pressed }) => [st.btn, pressed && { transform: [{ scale: 0.97 }] }, busy && { opacity: 0.6 }]}>
      {busy ? <ActivityIndicator color={colors.ink}/> : <Ionicons name="logo-google" size={18} color="#4285F4"/>}
      <Text style={st.text}>{busy ? 'Abriendo Google…' : label}</Text>
    </Pressable>
    {!!error && <Text style={st.error}>{error}</Text>}
  </View>;
}

const st = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: 999, borderWidth: 1, borderColor: '#dadce0', backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  text: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#1f1f1f' },
  error: { fontFamily: fonts.body, fontSize: 12.5, color: colors.late },
});
