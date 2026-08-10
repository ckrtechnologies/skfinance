import React, { useState, useRef, useEffect } from 'react';
import { FlatList, Image, Dimensions, TouchableOpacity, StyleSheet, Animated, ImageBackground } from 'react-native';
import { YStack, XStack, H2, Paragraph, SizableText } from 'tamagui';
import { PrimaryButton } from '../ui/Components';
import { colors } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Top Dealer Partner Network',
    description: 'Join 5,000+ top Indian vehicle dealers earning award-winning incentives with instant multi-lender pre-checks.',
    image: require('../assets/welcome_1.jpg'),
  },
  {
    id: '2',
    title: 'Up to 2% Instant Commission',
    description: 'Earn up to 2% instant commission payout on every disbursed loan with real-time mobile notifications & direct bank transfers.',
    image: require('../assets/welcome_2.jpg'),
  },
  {
    id: '3',
    title: 'Dedicated Dealer Growth & Support',
    description: 'Empower your dealership with priority credit underwriter approval, fast digital KYC, and 24/7 dedicated support.',
    image: require('../assets/welcome_3.jpg'),
  },
];

export default function OnboardingWelcomeScreen({ onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(c => c + 1);
    } else {
      onFinish();
    }
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <YStack f={1} backgroundColor="$background">
      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={item => item.id}
        bounces={false}
        renderItem={({ item }) => (
          <ImageBackground 
            source={item.image} 
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            resizeMode="cover"
          >
            {/* Dark Gradient Overlay for text readability */}
            <YStack f={1} backgroundColor="rgba(0,0,0,0.4)" jc="space-between">
              
              {/* Header Bar with Logo & Skip */}
              <XStack jc="space-between" ai="center" px="$4" pt="$10" pb="$3">
                <Image 
                  source={require('../assets/logo.png')} 
                  style={{ width: 120, height: 36 }}
                  resizeMode="contain" 
                />
                <TouchableOpacity onPress={onFinish}>
                  <SizableText color="white" fontWeight="bold" fontSize={16}>
                    Skip
                  </SizableText>
                </TouchableOpacity>
              </XStack>

              {/* Bottom Content Area */}
              <YStack px="$5" pb="$10" space="$4" jc="flex-end">
                <YStack ai="flex-start" space="$2" mb="$4">
                  <H2 color="white" fontWeight="bold" fontSize={28} lineHeight={34}>
                    {item.title}
                  </H2>
                  <Paragraph color="rgba(255,255,255,0.8)" fontSize={16} lineHeight={24}>
                    {item.description}
                  </Paragraph>
                </YStack>

                {/* Dots Indicator */}
                <XStack jc="flex-start" ai="center" space="$2" mb="$4">
                  {SLIDES.map((_, idx) => (
                    <YStack
                      key={idx}
                      height={4}
                      width={currentIndex === idx ? 24 : 12}
                      borderRadius={2}
                      backgroundColor={currentIndex === idx ? 'white' : 'rgba(255,255,255,0.3)'}
                    />
                  ))}
                </XStack>

                {/* Action Button */}
                <PrimaryButton 
                  width="100%" 
                  onPress={handleNext} 
                  backgroundColor="white" 
                  color={colors.brandBlue}
                  pressStyle={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                >
                  <SizableText color={colors.brandBlue} fontWeight="bold" fontSize={16}>
                    {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next →'}
                  </SizableText>
                </PrimaryButton>
              </YStack>

            </YStack>
          </ImageBackground>
        )}
      />

      {/* No more Splash Overlay - handled centrally by App.js */}
    </YStack>
  );
}
