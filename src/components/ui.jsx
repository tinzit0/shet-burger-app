import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors, fonts, imageUrl } from '../lib/theme';

// Botón con respuesta al presionar (escala 0.97): se siente físico en iPhone y Android.
export function Button({ title, onPress, variant = 'primary', disabled, right, style, small, haptic = true }) {
  const v = variants[variant];
  return <Pressable
    accessibilityRole="button" disabled={disabled} hitSlop={6} pressRetentionOffset={12}
    onPress={() => { if (haptic) Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
    style={({ pressed }) => [s.button, small && s.buttonSmall, v.box, disabled && s.disabled, pressed && !disabled && s.pressed, style]}>
    <Text style={[s.buttonText, small && s.buttonTextSmall, v.text]} numberOfLines={1}>{title}</Text>{right}
  </Pressable>;
}

const variants = {
  primary: { box: { backgroundColor: colors.ink }, text: { color: colors.cream } },
  pink: { box: { backgroundColor: colors.pink }, text: { color: colors.ink } },
  outline: { box: { borderWidth: 1, borderColor: colors.ink, backgroundColor: 'transparent' }, text: { color: colors.ink } },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.muted } },
  danger: { box: { backgroundColor: colors.late }, text: { color: colors.white } },
};

export function Chip({ label, active, onPress, right }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress?.(); }}
    style={({ pressed }) => [s.chip, active && s.chipActive, pressed && s.pressed]}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>{right}
  </Pressable>;
}

export const Display = ({ children, style, size = 34, color = colors.ink, ...rest }) =>
  <Text {...rest} style={[{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.02, color, textTransform: 'uppercase' }, style]}>{children}</Text>;

export const Eyebrow = ({ children, color = colors.pinkDeep, style }) => <Text style={[s.eyebrow, { color }, style]}>{children}</Text>;

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export function Field({ label, hint, error, prefix, style, ...input }) {
  return <View style={[{ gap: 6 }, style]}>
    {label && <Text style={s.label}>{label}</Text>}
    <View style={[s.inputWrap, error && { borderColor: colors.late }]}>
      {prefix && <Text style={s.prefix}>{prefix}</Text>}
      <TextInput placeholderTextColor={colors.mutedLight} style={s.input} {...input}/>
    </View>
    {!!(error || hint) && <Text style={[s.hint, error && { color: colors.late }]}>{error || hint}</Text>}
  </View>;
}

export function Stepper({ value, onChange, min = 0, max = 25, label }) {
  const step = next => { if (next < min || next > max) return; Haptics.selectionAsync().catch(() => {}); onChange(next); };
  return <View style={s.stepper} accessibilityLabel={label}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${label || ''}`} hitSlop={8} disabled={value <= min} onPress={() => step(value - 1)} style={({ pressed }) => [s.stepBtn, value <= min && s.disabled, pressed && s.pressed]}><Text style={s.stepSign}>−</Text></Pressable>
    <Text style={s.stepValue}>{value}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Agregar ${label || ''}`} hitSlop={8} disabled={value >= max} onPress={() => step(value + 1)} style={({ pressed }) => [s.stepBtn, value >= max && s.disabled, pressed && s.pressed]}><Text style={s.stepSign}>+</Text></Pressable>
  </View>;
}

// Igual que productImages.js de la web: las bebidas usan sus fotos de lata si el catálogo no trae una.
const drinkImages = { 'bebida-0': '/assets/drinks/coca-cola.webp', 'bebida-1': '/assets/drinks/coca-cola-zero.webp', 'bebida-2': '/assets/drinks/sprite.webp', 'bebida-3': '/assets/drinks/sprite-zero.webp', 'bebida-4': '/assets/drinks/fanta.webp', 'bebida-5': '/assets/drinks/kem.webp', 'jugo-jumex': '/assets/drinks/jumex-durazno.webp' };
export const productImagePath = product => product?.image || (product?.category === 'bebidas' ? drinkImages[product.id] : undefined);

export function ProductPhoto({ product, style, contentFit = 'cover' }) {
  const uri = imageUrl(productImagePath(product));
  if (!uri) return <View style={[s.photoEmpty, style]}><Text style={s.photoEmptyText}>{(product?.name || 'SHET').slice(0, 14)}</Text></View>;
  return <Image source={{ uri }} style={[{ backgroundColor: colors.bone }, style]} contentFit={contentFit} transition={150} cachePolicy="memory-disk" accessibilityIgnoresInvertColors/>;
}

export const Notice = ({ children, tone = 'warn' }) => {
  const t = { warn: [colors.warnBg, colors.warn], bad: [colors.lateBg, colors.late], good: [colors.goodBg, colors.good] }[tone];
  return <View style={[s.notice, { backgroundColor: t[0] }]}><Text style={{ color: t[1], fontSize: 13, lineHeight: 18 }}>{children}</Text></View>;
};

export const T = ({ style, weight = 'regular', ...rest }) => <Text {...rest} style={[{ fontFamily: weight === 'bold' ? fonts.bodyBold : weight === 'medium' ? fonts.bodyMedium : fonts.body, color: colors.ink }, style]}/>;

export const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

export const s = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 999, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14 },
  buttonText: { fontFamily: fonts.button, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  buttonTextSmall: { fontSize: 11, letterSpacing: 0.8 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  disabled: { opacity: 0.4 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink, letterSpacing: 0.3 },
  chipTextActive: { color: colors.cream },
  eyebrow: { fontFamily: fonts.button, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14 },
  prefix: { fontSize: 16, color: colors.muted, marginRight: 6 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, lineHeight: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 3 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bone },
  stepSign: { fontSize: 20, fontWeight: '600', color: colors.ink, marginTop: -2 },
  stepValue: { minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  photoEmpty: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 8 },
  photoEmptyText: { fontFamily: fonts.display, color: colors.pink, fontSize: 18, textAlign: 'center', textTransform: 'uppercase' },
  notice: { borderRadius: 12, padding: 12 },
});
