import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

/** Green header with the Apna Okara name and an optional screen title. */
export function ScreenHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <View style={{ backgroundColor: colors.primary, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.lg }}>
      <AppText bold size={22} color="#FFFFFF">
        {title ?? t('common.siteName')}
      </AppText>
      {!title && (
        <AppText size={12} color="#DCFCE7">
          {t('common.tagline')}
        </AppText>
      )}
    </View>
  );
}

