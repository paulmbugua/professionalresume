import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';

import ProfileCardNative from './ProfileCard.native';
import type { Profile } from '@mytutorapp/shared/types';

interface ProfileGridProps {
  profiles: Profile[];
}

const ProfileGridNative: React.FC<ProfileGridProps> = ({ profiles }) => {
  const [visibleCount, setVisibleCount] = useState(10);

  // Increase the number of visible profiles when scrolling near the end
  const loadMore = () => {
    if (visibleCount < profiles.length) {
      setVisibleCount((prev) => prev + 10);
    }
  };

  const dataToRender = profiles.slice(0, visibleCount);

  if (!profiles || profiles.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-center text-gray-500">No profiles available.</Text>
      </View>
    );
  }

  return (
    <View className="p-4">
      <FlatList
        data={dataToRender}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        renderItem={({ item }) => (
          <View className="flex-1 m-2">
            <ProfileCardNative profile={item} />
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

export default ProfileGridNative;
