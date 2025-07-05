import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import ProfileCardNative from './ProfileCard.native';
import type { Profile } from '@mytutorapp/shared/types';
import tw from '../../tailwind';

interface ProfileGridProps {
  profiles: Profile[];
}

const ProfileGridNative: React.FC<ProfileGridProps> = ({ profiles }) => {
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const loadMore = () => {
    if (visibleCount < profiles.length) {
      setVisibleCount(prev => prev + 8);
    }
  };

  const filteredProfiles = selectedSubject
    ? profiles.filter(p => p.expertise?.includes(selectedSubject))
    : profiles;

  const dataToRender = filteredProfiles.slice(0, visibleCount);

  const topTutors = profiles.slice(0, 5); // Simulated "top rated"
  const subjects = ['Math', 'Science', 'English', 'History', 'Coding'];

  const featuredTutor = profiles.length > 0 ? profiles[0] : null;

  return (
    <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={tw`text-xl font-bold text-white mb-4`}>
        Welcome back 👋 Ready to learn?
      </Text>

      {/* Featured Tutor */}
      {featuredTutor && (
        <View style={tw`bg-plum p-4 rounded-xl mb-6`}>
          <Text style={tw`text-white text-lg font-semibold mb-2`}>
            ⭐ Featured Tutor
          </Text>
          <ProfileCardNative profile={featuredTutor} featured />
        </View>
      )}

      {/* Horizontal Scroll: Top Tutors */}
      <Text style={tw`text-white font-semibold mb-2`}>Top Rated Tutors</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-6`}>
        {topTutors.map(tutor => (
          <View key={tutor.id} style={tw`mr-4 w-48`}>
            <ProfileCardNative profile={tutor} compact />
          </View>
        ))}
      </ScrollView>

      {/* Filter Buttons */}
      <Text style={tw`text-white font-semibold mb-2`}>Filter by Subject</Text>
      <View style={tw`flex-row flex-wrap mb-4`}>
        {subjects.map(subject => (
          <TouchableOpacity
            key={subject}
            onPress={() =>
              setSelectedSubject(prev => (prev === subject ? null : subject))
            }
            style={tw`px-3 py-1 mr-2 mb-2 rounded-full ${
              selectedSubject === subject
                ? 'bg-white text-plum'
                : 'bg-gray-800 text-white'
            }`}
          >
            <Text style={tw`${selectedSubject === subject ? 'text-plum' : 'text-white'}`}>
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid of Tutors */}
      <Text style={tw`text-white font-semibold mb-3`}>
        {selectedSubject ? `Tutors for ${selectedSubject}` : 'All Tutors'}
      </Text>
      <FlatList
        data={dataToRender}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        scrollEnabled={false} // handled by ScrollView
        columnWrapperStyle={tw`flex-row justify-between mb-4`}
        renderItem={({ item }) => (
          <View style={tw`w-[48%]`}>
            <ProfileCardNative profile={item} />
          </View>
        )}
      />
    </ScrollView>
  );
};

export default ProfileGridNative;
