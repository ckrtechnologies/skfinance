import React from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { YStack, H2, Paragraph, SizableText } from 'tamagui';
import { logoutUser } from '../store/slices/authSlice';
import ScreenWrapper from '../ui/ScreenWrapper';
import { PrimaryButton, AltButton } from '../ui/Components';
import { colors } from '../theme';

import Config from 'react-native-config';

const getApiUrl = () => {
  let url = Config.API_URL || 'http://localhost:4000';
  if (Platform.OS === 'android' && url.includes('localhost')) url = url.replace('localhost', '10.0.2.2');
  return url;
};

export default function OnboardingRejectedScreen({ onResubmit }) {
  const dispatch = useDispatch();
  const { user, token } = useSelector(s => s.auth);
  const [rejectionReason, setRejectionReason] = React.useState(
    user?.rejection_reason || user?.onboarding_rejection_reason || ''
  );

  React.useEffect(() => {
    async function loadLatestStatus() {
      if (!token) return;
      try {
        const res = await fetch(`${getApiUrl()}/dealer/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        const d = json?.data || json;
        if (d?.onboarding_rejection_reason) {
          setRejectionReason(d.onboarding_rejection_reason);
        }
      } catch (e) {
        console.log('Error fetching rejection reason:', e);
      }
    }
    loadLatestStatus();
  }, [token]);

  const displayReason = rejectionReason || 'Your application did not meet the requirements.';

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <YStack f={1} jc="center" ai="center" p="$6" space="$5">
        <SizableText fontSize={64}>❌</SizableText>
        <YStack ai="center" space="$2">
          <H2 color={colors.error} fontWeight="bold" ta="center">Application Rejected</H2>
          <Paragraph color="$colorFocus" ta="center" lineHeight={22}>
            Unfortunately, your dealer application was not approved at this time.
          </Paragraph>
        </YStack>

        <YStack
          backgroundColor={colors.errorMuted}
          borderColor={colors.error}
          borderWidth={1}
          borderRadius="$4"
          p="$4"
          space="$2"
          width="100%"
        >
          <SizableText fontWeight="bold" color={colors.error}>Reason for Rejection</SizableText>
          <Paragraph color={colors.error} fontSize={13} lineHeight={20}>{displayReason}</Paragraph>
        </YStack>

        <PrimaryButton width="100%" onPress={onResubmit}>
          Edit & Resubmit Application
        </PrimaryButton>
        <AltButton width="100%" onPress={() => dispatch(logoutUser())}>
          Logout
        </AltButton>
      </YStack>
    </ScreenWrapper>
  );
}
