import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSidebarFilters } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

export interface SidebarProps {
  onFilterChange: (filterType: string, value: string, merge?: boolean) => void;
}

const teachingStyles = ['One-on-One', 'Group', 'Workshop', 'Lecture'];
const expertiseOptions = ['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'];
const ageGroups = ['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'];
const priceRanges = ['20-50', '51-100', '101-150', '151-200'];

const SidebarNative: React.FC<SidebarProps> = ({ onFilterChange }) => {
  const {
    activeSection,
    isCategoriesOpen,
    setCategoriesOpen,
    isFiltersOpen,
    setFiltersOpen,
    selectedTeachingStyle,
    setSelectedTeachingStyle,
    handleFilterClick,
  } = useSidebarFilters(onFilterChange);

  return (
    <ScrollView contentContainerStyle={tw`p-4 bg-plum h-full w-64 shadow-lg`}>
      {/* Header */}
      <View style={tw`border-b border-softPink pb-6 mb-6 mt-8`}>
        <Text style={tw`text-lg text-pink-500 text-left mt-2`}>
          Find tutors by category and preferences
        </Text>
      </View>

      {/* Main Sections */}
      <View style={tw`space-y-3`}>
        {['All Tutors', 'Free Session', 'My Favorites', 'My Recent Chats', 'Upcoming Classes'].map(
          (section) => (
            <TouchableOpacity
              key={section}
              onPress={() => handleFilterClick('section', section)}
              style={[
                tw`w-full py-1 rounded`,
                activeSection === section && tw`bg-softPink`,
              ]}
            >
              <Text style={tw`text-white`}>{section}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Categories */}
      <View style={tw`space-y-2 mt-6`}>
        <TouchableOpacity
          onPress={() => setCategoriesOpen(!isCategoriesOpen)}
          style={tw`flex-row items-center justify-between py-1`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isCategoriesOpen }}
        >
          <Text style={tw`text-xl font-semibold text-softPink uppercase tracking-wider`}>
            Subjects
          </Text>
          <FontAwesome
            name={isCategoriesOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#ec4899"
          />
        </TouchableOpacity>

        {isCategoriesOpen && (
          <View style={tw`pl-2 space-y-2`}>
            {[
              'Math Tutors',
              'Sciences',
              'Programming',
              'Art & Design',
              'Wellness',
              'Languages',
            ].map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => handleFilterClick('category', category)}
                style={tw`w-full py-1 rounded`}
              >
                <Text style={tw`text-white`}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={tw`space-y-2 mt-6`}>
        <TouchableOpacity
          onPress={() => setFiltersOpen(!isFiltersOpen)}
          style={tw`flex-row items-center justify-between py-1`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isFiltersOpen }}
        >
          <Text style={tw`text-xl font-semibold text-softPink uppercase tracking-wider`}>
            Filters
          </Text>
          <FontAwesome
            name={isFiltersOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#ec4899"
          />
        </TouchableOpacity>

        {isFiltersOpen && (
          <View style={tw`pl-2 space-y-6`}>
            {/* Experience Level */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Experience Level</Text>
              {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => handleFilterClick('experienceLevel', level)}
                  style={tw`w-full py-1 rounded`}
                >
                  <Text style={tw`text-white`}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Teaching Style */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Teaching Style</Text>
              {teachingStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  onPress={() => {
                    setSelectedTeachingStyle(style);
                    handleFilterClick('description.teachingStyle', style);
                  }}
                  style={[
                    tw`w-full py-1 rounded`,
                    selectedTeachingStyle === style && tw`bg-softPink`,
                  ]}
                >
                  <Text style={tw`text-white`}>{style}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Expertise */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Expertise</Text>
              {expertiseOptions.map((exp) => (
                <TouchableOpacity
                  key={exp}
                  onPress={() => handleFilterClick('description.expertise', exp, true)}
                  style={tw`w-full py-1 rounded`}
                >
                  <Text style={tw`text-white`}>{exp}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Age Group */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Age Group</Text>
              {ageGroups.map((ageGroup) => (
                <TouchableOpacity
                  key={ageGroup}
                  onPress={() => handleFilterClick('ageGroup', ageGroup)}
                  style={tw`w-full py-1 rounded`}
                >
                  <Text style={tw`text-white`}>{ageGroup}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pricing */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Pricing</Text>
              {!selectedTeachingStyle && (
                <Text style={tw`text-sm text-red-400`}>
                  Please select a Teaching Style first.
                </Text>
              )}
              {priceRanges.map((range) => (
                <TouchableOpacity
                  key={range}
                  onPress={() => handleFilterClick('pricing', range)}
                  disabled={!selectedTeachingStyle}
                  style={[
                    tw`w-full py-1 rounded`,
                    !selectedTeachingStyle && tw`opacity-50`,
                  ]}
                >
                  <Text style={tw`text-white`}>{range} Tokens</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default SidebarNative;
