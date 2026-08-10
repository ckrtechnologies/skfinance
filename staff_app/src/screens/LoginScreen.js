import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YStack, XStack, Input, Button, H2, Paragraph, Spinner, SizableText } from 'tamagui';
import { loginUser, requestOtpUser, verifyOtpUser } from '../store/slices/authSlice';
import { Image, Modal } from 'react-native';
import { User, Key } from '@tamagui/lucide-icons-2';
import { PrimaryButton, AltButton } from '../ui/Components';
import { colors } from '../theme';

import ScreenWrapper from '../ui/ScreenWrapper';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [isRequesting, setIsRequesting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const handleRequestOtp = async () => {
    setValidationError('');
    if (!identifier) {
      setValidationError('Please enter your email or phone number');
      return;
    }
    setIsRequesting(true);
    try {
      await dispatch(requestOtpUser({ identifier })).unwrap();
      setStep('verify');
    } catch (err) {
      setValidationError(typeof err === 'string' ? err : 'Failed to request OTP');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleVerifyOtp = () => {
    setValidationError('');
    if (!otp) {
      setValidationError('Please enter the OTP');
      return;
    }
    dispatch(verifyOtpUser({ identifier, otp }));
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <YStack f={1} jc="center" ai="center" p="$6" space="$5" backgroundColor="$background">
        <YStack space="$2" ai="center" mb="$4">
          <Image 
            source={require('../assets/logo.png')} 
            style={{ width: 80, height: 80, borderRadius: 18, marginBottom: 12 }} 
            resizeMode="cover" 
          />
          <H2 color={colors.brandBlue} fontWeight="bold">Shreeja Staff</H2>
          <Paragraph color={colors.textMutedLight || '#64748B'}>
            {step === 'request' ? 'Sign in with your phone or email' : 'Enter the 6-digit OTP sent to you'}
          </Paragraph>
        </YStack>

        <YStack w="100%" space="$4" maxWidth={400}>
          {step === 'request' ? (
            <>
              <XStack ai="center" borderWidth={1} borderColor={colors.border || '#ccc'} borderRadius="$4" p="$2" space="$2">
                <User color={colors.brandBlue} size={20} />
                <Input 
                  f={1} 
                  borderWidth={0} 
                  placeholder="Email or Phone" 
                  value={identifier} 
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
              </XStack>
              <PrimaryButton
                mt="$4"
                onPress={handleRequestOtp} 
                loading={isRequesting}
              >
                Request OTP
              </PrimaryButton>
            </>
          ) : (
            <>
              <XStack ai="center" borderWidth={1} borderColor={colors.border || '#ccc'} borderRadius="$4" p="$2" space="$2">
                <Key color={colors.brandBlue} size={20} />
                <Input 
                  f={1} 
                  borderWidth={0} 
                  placeholder="Enter OTP" 
                  value={otp} 
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </XStack>
              <PrimaryButton
                mt="$4"
                onPress={handleVerifyOtp} 
                loading={loading}
              >
                Verify & Sign In
              </PrimaryButton>
              <AltButton mt="$2" onPress={() => setStep('request')}>
                Back
              </AltButton>
            </>
          )}

          {(validationError || error) && (
            <SizableText color={colors.error} ta="center" fontWeight="500">
              {validationError || error}
            </SizableText>
          )}
        </YStack>
      </YStack>
    </ScreenWrapper>
  );
}
