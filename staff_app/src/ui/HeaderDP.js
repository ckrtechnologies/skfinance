import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Avatar, Text } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import { useGetProfileQuery } from '../store/api/dealerApi';

export default function HeaderDP() {
  const navigation = useNavigation();
  const { data: profileData } = useGetProfileQuery();

  let avatarUrl = profileData?.data?.profiles?.avatar_url;
  if (avatarUrl && Platform.OS === 'android' && avatarUrl.includes('localhost')) {
    avatarUrl = avatarUrl.replace('localhost', '10.0.2.2');
  }
  const fullName = profileData?.data?.profiles?.full_name || 'Dealer';

  return (
    <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ activeOpacity: 0.8, marginRight: 12 }}>
      {avatarUrl ? (
        <View style={{ borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.8)', overflow: 'hidden' }}>
          <Avatar circular size={36}>
            <Avatar.Image src={avatarUrl} />
            <Avatar.Fallback bc="$blue10" />
          </Avatar>
        </View>
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0A2540', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.8)' }}>
          <Text color="#FFF" fontWeight="bold" fontSize={16}>
            {fullName.charAt(0)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
