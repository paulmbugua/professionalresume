import React from 'react';
import { View, Text, Image, ActivityIndicator, FlatList } from 'react-native';
import { useAchievements } from '@mytutorapp/shared/hooks/useAchievements';
import { useShopContext } from '@mytutorapp/shared/context';
import tw from '../../tailwind';

const AchievementsList: React.FC<{ studentId?: number }> = ({ studentId }) => {
  const { backendUrl, token } = useShopContext();
  const { achievements, loading, error } = useAchievements({ backendUrl, token, studentId });

  if (loading) return <ActivityIndicator />;
  if (error) return <Text style={tw`text-red-500`}>{error}</Text>;
  if (!achievements.length) return <Text>No achievements yet.</Text>;

  return (
    <FlatList
      data={achievements}
      keyExtractor={(item) => item.id}
      contentContainerStyle={tw`p-4`}
      renderItem={({ item }) => (
        <View style={tw`bg-white border rounded-xl p-4 mb-3 flex-row items-center`}>
          {item.icon_url ? (
            <Image source={{ uri: item.icon_url }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12, backgroundColor: '#e7edf4' }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={tw`font-semibold`}>{item.title}</Text>
            <Text style={tw`text-xs text-gray-500`}>{new Date(item.earned_at).toLocaleString()}</Text>
            {item.course_id ? <Text style={tw`text-xs text-gray-500`}>Course: {item.course_id}</Text> : null}
          </View>
        </View>
      )}
    />
  );
};

export default AchievementsList;
