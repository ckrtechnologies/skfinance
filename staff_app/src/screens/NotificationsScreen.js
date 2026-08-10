import React from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { YStack, XStack, H2, H4, Paragraph, Spinner, SizableText, Card } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ArrowLeft, Info } from '@tamagui/lucide-icons-2';
import { useNavigation } from '@react-navigation/native';
import { dealerApi } from '../store/api/dealerApi'; // We will use a query here later

import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  // Using a placeholder for notifications until API is wired up correctly
  const { data: notificationsData, isLoading, refetch, isFetching } = dealerApi.endpoints.getNotifications?.useQuery() || { data: { success: true, data: [] }, isLoading: false, refetch: () => {}, isFetching: false };

  const notifications = notificationsData?.data || [];

  return (
    <YStack f={1} backgroundColor="$background">
        {isLoading ? (
          <YStack f={1} jc="center" ai="center">
            <Spinner size="large" color="$color" />
          </YStack>
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            contentContainerStyle={{ flexGrow: 1, padding: 16 }}
          >
            {notifications.length === 0 ? (
              <YStack f={1} jc="center" ai="center" space="$4" p="$8">
                <Bell size={48} color="$colorTransparent" />
                <Paragraph theme="alt2" ta="center">You have no new notifications.</Paragraph>
              </YStack>
            ) : (
              <YStack space="$3">
                {notifications.map((notif) => (
                  <Card key={notif.id} bordered padded>
                    <XStack space="$3" ai="flex-start">
                      <YStack mt="$1">
                        <Info size={20} color="$blue10" />
                      </YStack>
                      <YStack f={1}>
                        <H4>{notif.title}</H4>
                        <Paragraph mt="$1" theme="alt2">{notif.message}</Paragraph>
                        <SizableText size="$2" mt="$2" color="$colorTransparent">
                          {new Date(notif.created_at).toLocaleString()}
                        </SizableText>
                      </YStack>
                    </XStack>
                  </Card>
                ))}
              </YStack>
            )}
          </ScrollView>
        )}
    </YStack>
  );
}
