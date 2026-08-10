import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YStack, H2, Paragraph, SizableText } from 'tamagui';
import { logoutUser, fetchOnboardingStatus } from '../store/slices/authSlice';
import ScreenWrapper from '../ui/ScreenWrapper';
import { PrimaryButton, AltButton } from '../ui/Components';
import { colors } from '../theme';

export default function OnboardingPendingScreen() {
  const dispatch = useDispatch();
  const { loading } = useSelector(s => s.auth);

  const handleRefresh = useCallback(() => {
    dispatch(fetchOnboardingStatus());
  }, [dispatch]);

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <YStack f={1} jc="center" ai="center" p="$6" space="$5">
        <SizableText fontSize={64}>⏳</SizableText>
        <YStack ai="center" space="$2">
          <H2 color={colors.brandBlue} fontWeight="bold" ta="center">Application Under Review</H2>
          <Paragraph color="$colorFocus" ta="center" lineHeight={22}>
            Your dealer profile has been submitted and is being reviewed by our admin team.
            This usually takes 1–2 business days.
          </Paragraph>
        </YStack>

        <YStack
          backgroundColor={colors.warningMuted}
          borderColor={colors.warning}
          borderWidth={1}
          borderRadius="$4"
          p="$4"
          space="$2"
          width="100%"
        >
          <SizableText fontWeight="bold" color={colors.warning}>What happens next?</SizableText>
          <Paragraph color="$colorFocus" fontSize={13} lineHeight={20}>
            1. Admin will review your submitted documents.{'\n'}
            2. You will receive an SMS/email once approved.{'\n'}
            3. After approval, log back in to start submitting loan applications.
          </Paragraph>
        </YStack>

        <PrimaryButton width="100%" onPress={handleRefresh} loading={loading}>
          Check Status
        </PrimaryButton>
        <AltButton width="100%" onPress={() => dispatch(logoutUser())}>
          Logout
        </AltButton>
      </YStack>
    </ScreenWrapper>
  );
}
