import { Text, type TextProps, type TextStyle } from 'react-native';
import { useI18n } from '../i18n';
import { colors, fontFor } from '../theme';

type Props = TextProps & { bold?: boolean; size?: number; color?: string; align?: TextStyle['textAlign'] };

/** Text that uses the Urdu Nastaliq font and right alignment when Urdu is selected. */
export function AppText({ bold, size = 15, color = colors.text, align, style, ...rest }: Props) {
  const { locale, isUrdu } = useI18n();
  const family = fontFor(locale, bold);
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: size,
          color,
          fontWeight: bold && !isUrdu ? '700' : '400',
          fontFamily: family,
          lineHeight: isUrdu ? size * 2 : size * 1.4,
          textAlign: align ?? (isUrdu ? 'right' : 'left'),
          writingDirection: isUrdu ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}
