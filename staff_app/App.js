import React, { useEffect } from 'react';
import { StatusBar, useColorScheme, Image, Animated, Easing } from 'react-native';
import { TamaguiProvider, Theme, Spinner, YStack, Text, PortalProvider } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
import { checkAuthStatus } from './src/store/slices/authSlice';
import { loadTheme } from './src/store/slices/themeSlice';
import { colors } from './src/theme';
import tamaguiConfig from './tamagui.config';
import { AlertProvider } from './src/context/AlertContext';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ApplicationsScreen from './src/screens/ApplicationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NewApplicationScreen from './src/screens/NewApplicationScreen';
import ApplicationDetailsScreen from './src/screens/ApplicationDetailsScreen';
import WalletScreen from './src/screens/WalletScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import OnboardingPendingScreen from './src/screens/OnboardingPendingScreen';
import OnboardingRejectedScreen from './src/screens/OnboardingRejectedScreen';

const Stack = createNativeStackNavigator();
import DrawerNavigator from './src/navigation/DrawerNavigator';
import OnboardingWelcomeScreen from './src/screens/OnboardingWelcomeScreen';
import AnimatedSplash from './src/ui/AnimatedSplash';

function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, loading, onboarding_status, isInitialized } = useSelector(state => state.auth);
  const [showOnboardingForm, setShowOnboardingForm] = React.useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = React.useState(false);
  const [isSplashComplete, setIsSplashComplete] = React.useState(false);

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Once authenticated, mark welcome as seen so it doesn't show on logout
  useEffect(() => {
    if (isAuthenticated) {
      setHasSeenWelcome(true);
    }
  }, [isAuthenticated]);

  // Keep splash active until the cinematic animation finishes AND auth is initialized
  const splash = (!isSplashComplete || !isInitialized) ? (
    <AnimatedSplash onFinish={() => setIsSplashComplete(true)} />
  ) : null;

  if (!isInitialized) return splash;

  const brandHeaderOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor: colors.brandBlueDark,
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: '700',
      fontSize: 18,
      color: '#FFFFFF',
    },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          !hasSeenWelcome ? (
            <Stack.Screen name="Welcome">
              {props => <OnboardingWelcomeScreen {...props} onFinish={() => setHasSeenWelcome(true)} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )
        ) : onboarding_status !== 'approved' && onboarding_status !== null ? (
          <Stack.Screen name="Onboarding">
            {props => {
              if (onboarding_status === 'under_review') return <OnboardingPendingScreen {...props} />;
              if (onboarding_status === 'rejected' && !showOnboardingForm) return <OnboardingRejectedScreen {...props} onResubmit={() => setShowOnboardingForm(true)} />;
              return <OnboardingScreen {...props} onSuccess={() => setShowOnboardingForm(false)} />;
            }}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={DrawerNavigator} />
            <Stack.Screen name="NewApplication" component={NewApplicationScreen} options={{ ...brandHeaderOptions, title: 'New Application' }} />
            <Stack.Screen name="ApplicationDetails" component={ApplicationDetailsScreen} options={{ ...brandHeaderOptions, title: 'Application Details' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...brandHeaderOptions, title: 'Notifications' }} />
          </>
        )}
      </Stack.Navigator>
      {splash}
    </>
  );
}

function AppRoot() {
  const systemColorScheme = useColorScheme();
  const dispatch = useDispatch();
  const { value, loading } = useSelector(state => state.theme);

  useEffect(() => {
    dispatch(loadTheme());
  }, [dispatch]);

  const activeTheme = value === 'system' ? systemColorScheme : value;
  const isDarkMode = activeTheme === 'dark';

  if (loading) return null;



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme={isDarkMode ? 'dark' : 'light'}>
        <Theme name={isDarkMode ? 'dark' : 'light'}>
          <PortalProvider shouldAddRootHost>
            <SafeAreaProvider style={{ flex: 1, backgroundColor: isDarkMode ? '#000' : '#fff' }}>
              <StatusBar barStyle="light-content" backgroundColor="#0A2540" />
              <AlertProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </AlertProvider>
            </SafeAreaProvider>
          </PortalProvider>
        </Theme>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

import { ErrorBoundary } from './src/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AppRoot />
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
