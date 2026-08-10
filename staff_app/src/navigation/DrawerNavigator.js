import React from 'react';
import { View, Switch, Image, TouchableOpacity, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { Home, FileText, User, Wallet, Bell, LogOut, Moon, Sun, Trash2, Key } from '@tamagui/lucide-icons-2';
import { YStack, XStack, Text, Separator } from 'tamagui';
import { useColorScheme } from 'react-native';
import { logoutUser } from '../store/slices/authSlice';
import { setTheme } from '../store/slices/themeSlice';
import { useGetProfileQuery } from '../store/api/dealerApi';
import DashboardScreen from '../screens/DashboardScreen';
import { useAppAlert } from '../context/AlertContext';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WalletScreen from '../screens/WalletScreen';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const systemColorScheme = useColorScheme();
  const themePref = useSelector(state => state.theme.value);
  const activeTheme = themePref === 'system' ? systemColorScheme : themePref;
  const isDarkMode = activeTheme === 'dark';
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#151515' : '#ffffff',
          borderTopColor: isDarkMode ? '#333' : '#eee',
        },
        tabBarActiveTintColor: isDarkMode ? '#fff' : '#000',
        tabBarInactiveTintColor: isDarkMode ? '#888' : '#333',
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="ApplicationsTab" 
        component={ApplicationsScreen} 
        options={{ title: 'Applications', tabBarIcon: ({ color, size }) => <FileText color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="WalletTab" 
        component={WalletScreen} 
        options={{ title: 'Wallet', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

function CustomDrawerContent(props) {
  const { showAlert } = useAppAlert();
  const dispatch = useDispatch();
  const { user, profile } = useSelector(state => state.auth);
  const themePref = useSelector(state => state.theme.value);
  const isDarkMode = themePref === 'dark';

  const handleLogout = () => {
    showAlert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => dispatch(logoutUser()) }
    ]);
  };

  const handleDeleteAccount = () => {
    showAlert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        // Implement delete account logic here
        showAlert('Account Deletion', 'Please contact support to delete your account.');
      }}
    ]);
  };

  const handleThemeToggle = () => {
    dispatch(setTheme(isDarkMode ? 'light' : 'dark'));
  };

  const { data: profileResponse } = useGetProfileQuery();
  const dealerData = profileResponse?.data || {};
  const profileData = dealerData.profiles || {};

  let avatarUrl = profileData.avatar_url;
  if (avatarUrl && Platform.OS === 'android' && avatarUrl.includes('localhost')) {
    avatarUrl = avatarUrl.replace('localhost', '10.0.2.2');
  }

  const fullName = profileData.full_name || 'Dealer';
  const businessName = dealerData.business_name || 'Dealer Business';

  const navigateAndClose = (screen, params) => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screen, params);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: isDarkMode ? '#151515' : '#FFFFFF' }}>
      
      {/* Header Profile Section */}
      <YStack padding="$4" alignItems="center" backgroundColor={isDarkMode ? '#222' : '#F5F5F5'} borderBottomWidth={1} borderBottomColor={isDarkMode ? '#333' : '#EEE'} space="$2">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
        ) : (
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#0A2540', alignItems: 'center', justifyContent: 'center' }}>
            <Text color="#FFF" fontSize={28} fontWeight="bold">{fullName.charAt(0)}</Text>
          </View>
        )}
        <YStack alignItems="center">
          <Text fontSize={18} fontWeight="bold" color={isDarkMode ? '#FFF' : '#000'}>{fullName}</Text>
          <Text fontSize={14} color="#888">{businessName}</Text>
        </YStack>
      </YStack>

      <YStack padding="$2" space="$1">
        <Text fontSize={11} color="#888" marginLeft="$4" marginTop="$2" marginBottom="$1" fontWeight="bold">OVERVIEW</Text>
        
        <TouchableOpacity onPress={() => navigateAndClose('MainTabs', { screen: 'DashboardTab' })} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Home color="#3B82F6" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateAndClose('MainTabs', { screen: 'WalletTab' })} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Wallet color="#10B981" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>Wallet & Earnings</Text>
        </TouchableOpacity>

        <Separator marginVertical="$1" borderColor={isDarkMode ? '#333' : '#EEE'} />

        <Text fontSize={11} color="#888" marginLeft="$4" marginTop="$1" marginBottom="$1" fontWeight="bold">OPERATIONS</Text>
        
        <TouchableOpacity onPress={() => navigateAndClose('NewApplication')} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <FileText color="#F59E0B" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>New Application</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateAndClose('MainTabs', { screen: 'ApplicationsTab' })} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <FileText color="#8B5CF6" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>Application History</Text>
        </TouchableOpacity>

        <Separator marginVertical="$1" borderColor={isDarkMode ? '#333' : '#EEE'} />

        <Text fontSize={11} color="#888" marginLeft="$4" marginTop="$1" marginBottom="$1" fontWeight="bold">ACCOUNT</Text>
        
        <TouchableOpacity onPress={() => navigateAndClose('MainTabs', { screen: 'ProfileTab' })} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <User color="#EC4899" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigateAndClose('Notifications')} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Bell color="#06B6D4" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Alert.alert('Change Password', 'Coming soon.')} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Key color="#64748B" size={20} />
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>Change Password</Text>
        </TouchableOpacity>

        {/* Theme Toggle Item */}
        <TouchableOpacity onPress={handleThemeToggle} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            {isDarkMode ? <Moon color="#6366F1" size={20} /> : <Sun color="#F59E0B" size={20} />}
          </View>
          <Text style={{ flex: 1, color: isDarkMode ? '#FFF' : '#1E293B', fontWeight: '600', fontSize: 14 }}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={handleThemeToggle} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDeleteAccount} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Trash2 color="#EF4444" size={20} />
          </View>
          <Text style={{ flex: 1, color: '#EF4444', fontWeight: '600', fontSize: 14 }}>Delete Account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <LogOut color="#EF4444" size={20} />
          </View>
          <Text style={{ flex: 1, color: '#EF4444', fontWeight: '600', fontSize: 14 }}>Log Out</Text>
        </TouchableOpacity>
      </YStack>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: 300 }
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}
