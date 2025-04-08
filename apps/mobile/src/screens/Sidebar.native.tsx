import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSidebarFilters } from '@shared/hooks';
import tw from 'twrnc';

export interface SidebarProps {
  onFilterChange: (filterType: string, value: string) => void;
}

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
    <ScrollView style={tw`p-4 bg-plum text-white h-full w-64 shadow-lg`}>
      {/* Sidebar Header */}
      <View style={tw`border-b border-softPink pb-6 mb-6 mt-8`}>
        <Text style={tw`text-lg text-pink-500 text-left mt-2`}>
          Find tutors by category and preferences
        </Text>
      </View>

      {/* Main Links */}
      <View style={tw`space-y-3`}>
        {['All Tutors', 'Free Session', 'My Favorites', 'My Recent Chats', 'Upcoming Classes'].map((section) => (
          <TouchableOpacity
            key={section}
            onPress={() => handleFilterClick('section', section)}
            style={tw`w-full py-1 rounded`}
          >
            <Text
              style={tw`text-xl font-medium ${
                activeSection === section ? 'text-softPink font-semibold' : 'text-softGray'
              }`}
            >
              {section}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Collapsible Categories Section */}
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
            color={tw.color('softPink')}
          />
        </TouchableOpacity>
        {isCategoriesOpen && (
          <View style={tw`pl-0 space-y-2`}>
            {['Math Tutors', 'Sciences', 'Programming', 'Art & Design', 'Wellness', 'Languages'].map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => handleFilterClick('category', category)}
                style={tw`w-full py-1 rounded`}
              >
                <Text
                  style={tw`text-xl font-medium ${
                    activeSection === category ? 'text-softPink font-semibold' : 'text-softGray'
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Collapsible Filters Section */}
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
            color={tw.color('softPink')}
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
                  <Text
                    style={tw`text-sm font-medium ${
                      activeSection === level ? 'text-softPink font-semibold' : 'text-softGray'
                    }`}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Teaching Style */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Teaching Style</Text>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <TouchableOpacity
                  key={style}
                  onPress={() => {
                    (setSelectedTeachingStyle as React.Dispatch<React.SetStateAction<string | null>>)(style);
                    handleFilterClick('description.teachingStyle', style);
                  }}
                  style={tw`w-full py-1 rounded`}
                >
                  <Text
                    style={tw`text-sm font-medium ${
                      activeSection === style ? 'text-softPink font-semibold' : 'text-softGray'
                    }`}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Expertise */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Expertise</Text>
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((expertise) => (
                <TouchableOpacity
                  key={expertise}
                  onPress={() => handleFilterClick('description.expertise', expertise, true)}
                  style={tw`w-full py-1 rounded`}
                >
                  <Text
                    style={tw`text-sm font-medium ${
                      activeSection === expertise ? 'text-softPink font-semibold' : 'text-softGray'
                    }`}
                  >
                    {expertise}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Age Group */}
            <View>
              <Text style={tw`text-lg font-semibold text-softGray`}>Age Group</Text>
              {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((ageGroup) => (
                <TouchableOpacity
                  key={ageGroup}
                  onPress={() => handleFilterClick('ageGroup', ageGroup)}
                  style={tw`w-full py-1 rounded`}
                >
                  <Text
                    style={tw`text-sm font-medium ${
                      activeSection === ageGroup ? 'text-softPink font-semibold' : 'text-softGray'
                    }`}
                  >
                    {ageGroup}
                  </Text>
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
              {['20-50', '51-100', '101-150', '151-200'].map((range) => (
                <TouchableOpacity
                  key={range}
                  onPress={() => handleFilterClick('pricing', range)}
                  style={tw`w-full py-1 rounded ${!selectedTeachingStyle ? 'opacity-50' : ''}`}
                  disabled={!selectedTeachingStyle}
                >
                  <Text
                    style={tw`text-sm font-medium ${
                      activeSection === range ? 'text-softPink font-semibold' : 'text-softGray'
                    }`}
                  >
                    {range} Tokens
                  </Text>
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
