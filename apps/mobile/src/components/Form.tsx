import type { ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

export function Label({ children }: { children: ReactNode }) {
  return (
    <AppText bold size={14} style={{ marginBottom: 4 }}>
      {children}
    </AppText>
  );
}

export function ErrorText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <AppText size={13} color={colors.danger} accessibilityRole="alert" style={{ marginTop: 2 }}>
      {text}
    </AppText>
  );
}

export function Input({ label, error, ltr, ...props }: TextInputProps & { label: string; error?: string; ltr?: boolean }) {
  const { isUrdu } = useI18n();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.sm,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            fontSize: 16,
            color: colors.text,
            textAlign: ltr ? 'left' : isUrdu ? 'right' : 'left',
          },
          props.multiline ? { minHeight: 110, textAlignVertical: 'top' } : null,
        ]}
      />
      <ErrorText text={error} />
    </View>
  );
}

/** Tappable choice chip (category, duration, option). */
export function Chip({ label, active, onPress, sub }: { label: string; active: boolean; onPress: () => void; sub?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        minHeight: 44,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primaryLight : colors.surface,
        justifyContent: 'center',
        margin: 4,
      }}
    >
      <AppText bold size={14} align="center" color={active ? colors.primaryDark : colors.text}>
        {label}
      </AppText>
      {sub ? (
        <AppText size={12} align="center" color={colors.textMuted}>
          {sub}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'accent' | 'outline'; disabled?: boolean }) {
  const bg = kind === 'primary' ? colors.primary : kind === 'accent' ? colors.accent : colors.surface;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={{
        minHeight: 48,
        borderRadius: radius.sm,
        backgroundColor: bg,
        borderWidth: kind === 'outline' ? 1 : 0,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <AppText bold align="center" color={kind === 'outline' ? colors.text : '#FFFFFF'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  const { isUrdu } = useI18n();
  return <View style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>{children}</View>;
}
