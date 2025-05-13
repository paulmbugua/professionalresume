import React from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Platform } from 'react-native';
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

  const mainSections = ['All Tutors', 'Free Session', 'My Favorites', 'My Recent Chats', 'Upcoming Classes'];
  const categories = ['Math Tutors', 'Sciences', 'Programming', 'Art & Design', 'Wellness', 'Languages'];

  return (
    <SafeAreaView style={tw`flex-1 bg-plum ${Platform.OS === 'ios' ? 'pt-6' : ''}`}>  
      <ScrollView contentContainerStyle={tw`p-4 w-64`} showsVerticalScrollIndicator>
        {/* Header */}
        <View style={tw`border-b border-softPink pb-4 mb-4`}>  
          <Text style={tw`text-base font-semibold text-pink-400`}>
            Find tutors by category and preferences
          </Text>
        </View>

        {/* Main Sections */}
        <View>
          {mainSections.map((section, idx) => (
            <TouchableOpacity
              key={section}
              onPress={() => handleFilterClick('section', section)}
              style={[
                tw`w-full rounded-lg px-4 py-2`,
                idx > 0 && tw`mt-3`,
                activeSection === section && { backgroundColor: 'rgba(236,72,153,0.3)' },
              ]}
            >
              <Text style={tw`text-base font-normal text-white`}>{section}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={tw`mt-6`}>  
          <TouchableOpacity
            onPress={() => setCategoriesOpen(!isCategoriesOpen)}
            style={tw`flex-row items-center justify-between py-2`}
            accessibilityRole="button"
            accessibilityState={{ expanded: isCategoriesOpen }}
          >
            <Text style={tw`text-base font-semibold text-softPink uppercase`}>
              Subjects
            </Text>
            <FontAwesome
              name={isCategoriesOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#ec4899"
            />
          </TouchableOpacity>

          {isCategoriesOpen && (
            <View style={tw`pl-4 mt-2`}>  
              {categories.map((category, idx) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => handleFilterClick('category', category)}
                  style={[tw`w-full py-1 rounded-md px-4`, idx > 0 && tw`mt-2`]}
                >
                  <Text style={tw`text-base font-normal text-white`}>{category}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Filters */}
        <View style={tw`mt-6`}>  
          <TouchableOpacity
            onPress={() => setFiltersOpen(!isFiltersOpen)}
            style={tw`flex-row items-center justify-between py-2`}
            accessibilityRole="button"
            accessibilityState={{ expanded: isFiltersOpen }}
          >
            <Text style={tw`text-base font-semibold text-softPink uppercase`}>
              Filters
            </Text>
            <FontAwesome
              name={isFiltersOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#ec4899"
            />
          </TouchableOpacity>

          {isFiltersOpen && (
            <View style={tw`pl-4 mt-2`}>  
              {[  
                {
                  key: 'experience',
                  title: 'Experience Level',
                  options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
                  onPress: (opt: string) => handleFilterClick('experienceLevel', opt),
                },
                {
                  key: 'teaching',
                  title: 'Teaching Style',
                  options: teachingStyles,
                  onPress: (opt: string) => {
                    setSelectedTeachingStyle(opt);
                    handleFilterClick('description.teachingStyle', opt);
                  },
                  selected: selectedTeachingStyle,
                },
                {
                  key: 'expertise',
                  title: 'Expertise',
                  options: expertiseOptions,
                  onPress: (opt: string) => handleFilterClick('description.expertise', opt, true),
                },
                {
                  key: 'age',
                  title: 'Age Group',
                  options: ageGroups,
                  onPress: (opt: string) => handleFilterClick('ageGroup', opt),
                },
                {
                  key: 'pricing',
                  title: 'Pricing',
                  options: priceRanges.map(r => `${r} Tokens`),
                  onPress: (opt: string) => handleFilterClick('pricing', opt),
                  disabled: !selectedTeachingStyle,
                  note: !selectedTeachingStyle ? 'Select Teaching Style first.' : undefined,
                },
              ].map((group, idx) => (
                <View key={group.key} style={tw`${idx > 0 ? 'mt-6' : ''}`}>  
                  <Text style={tw`text-base font-semibold text-softGray`}>{group.title}</Text>
                  {group.note && <Text style={tw`text-sm text-red-400`}>{group.note}</Text>}

                  {group.options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => group.onPress(opt)}
                      disabled={Boolean(group.disabled)}
                      style={[
                        tw`w-full py-1 rounded-md px-4`,
                        group.disabled && tw`opacity-50`,
                        group.selected === opt && { backgroundColor: 'rgba(236,72,153,0.3)' },
                        idx > 0 && tw`mt-2`,
                      ]}
                    >
                      <Text style={tw`text-base font-normal text-white`}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SidebarNative;
