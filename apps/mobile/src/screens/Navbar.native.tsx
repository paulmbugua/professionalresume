// apps/mobile/src/screens/Navbar.native.tsx

import React, { useState, useMemo, useEffect, FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import debounce from 'lodash.debounce';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavbar } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Messages: undefined;
  Settings: undefined;
  BuyTokens: undefined;
  ClassVaultLibrary: undefined;
};
type NavProp = StackNavigationProp<RootStackParamList>;

export interface NavbarProps {
  onSearch: (term: string) => void;
  onFilterChange: (filterType: string, value: string, merge?: boolean) => void;
  clearFilters: () => void;
}

const NAV_OPTIONS = [
  { key: 'allTutors',    label: 'All Tutors',      type: 'reset'    },
  { key: 'videos',       label: 'Videos',          type: 'dropdown' },
  { key: 'topRated',     label: 'Top Rated',       type: 'sort'     },
  { key: 'lowPrice',     label: 'Lowest Price',    type: 'sort'     },
  { key: 'experienced',  label: 'Most Experienced',type: 'sort'     },
  { key: 'category',     label: 'Subject',         type: 'dropdown' },
  { key: 'ageGroup',     label: 'Grade Level',     type: 'dropdown' },
  { key: 'description.teachingStyle',  label: 'Teaching Style',   type: 'dropdown' },
  { key: 'experienceLevel',            label: 'Experience',       type: 'dropdown' },
  { key: 'description.expertise',      label: 'Expertise',        type: 'dropdown' },
  { key: 'pricing',       label: 'Pricing',          type: 'dropdown' },
] as const;
type OptionKey = typeof NAV_OPTIONS[number]['key'];

const DROPDOWNS: Record<OptionKey, string[]> = {
  allTutors:   [],
  videos:      ['Subject', 'Grade Level'],
  topRated:    [],
  lowPrice:    [],
  experienced: [],
  category:    ['Math','Science','Programming','Art','Wellness','Languages'],
  ageGroup:    ['Pre-Primary','Lower Primary','Upper Primary','University','Adults'],
  'description.teachingStyle': ['One-on-One','Group','Workshop','Lecture'],
  experienceLevel: ['Beginner','Intermediate','Advanced','Expert'],
  'description.expertise': ['Exam Prep','Skill Building','Homework','Career Guidance'],
  pricing: ['20–50','51–100','101–150','151–200'],
};

export const NavbarNative: FC<NavbarProps> = ({
  onSearch,
  onFilterChange,
  clearFilters,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { searchTerm, setSearchTerm } = useNavbar({
    onLogout:    () => navigation.navigate('Login'),
    onLogoClick: () => navigation.navigate('Home'),
  });

  const [openDropdown, setOpenDropdown] = useState<OptionKey | null>(null);

  const initialFilters = NAV_OPTIONS.reduce((acc, { key }) => {
    acc[key] = [] as string[];
    return acc;
  }, {} as Record<OptionKey, string[]>);
  const [filters, setFilters] = useState(initialFilters);

  const hasActive = useMemo(
    () => Object.values(filters).some(arr => arr.length > 0),
    [filters]
  );

  const debounced = useMemo(
    () => debounce(() => onSearch(searchTerm), 300),
    [onSearch, searchTerm]
  );
  useEffect(() => () => debounced.cancel(), [debounced]);

  const onChangeSearch = (text: string) => {
    setSearchTerm(text);
    debounced();
  };

  const toggleFilter = (key: OptionKey, value: string) => {
    setFilters(prev => {
      const curr = prev[key] ?? [];
      const next = curr.includes(value)
        ? curr.filter(v => v !== value)
        : [...curr, value];
      return { ...prev, [key]: next };
    });
    onFilterChange(key, value, true);
  };

  const Pill: FC<{ label: string; selected: boolean; onPress(): void }> = ({
    label,
    selected,
    onPress,
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={tw.style(
        'mr-3 px-4 py-1 rounded-full',
        selected ? 'bg-softPink' : 'bg-white bg-opacity-20'
      )}
    >
      <Text style={tw.style('text-sm', selected ? 'text-plum' : 'text-white')}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        tw`bg-plum`,
        { paddingTop: insets.top + 12 },
      ]}
    >
      {/* Search Bar */}
      <View style={tw`px-6 pt-4 pb-4 bg-plum`}>
        <View style={tw`flex-row items-center bg-white bg-opacity-20 rounded-full px-4 py-2`}>
          <FontAwesome name="search" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            value={searchTerm}
            onChangeText={onChangeSearch}
            placeholder="Search Tutors and Videos"
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={tw`ml-2 flex-1 text-white`}
            returnKeyType="search"
            onSubmitEditing={() => onSearch(searchTerm)}
          />
        </View>
      </View>

      {/* Top‐level pills */}
      <View style={tw`bg-white bg-opacity-20`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-6 py-2 items-center`}
        >
          {NAV_OPTIONS.map(({ key, label, type }) => {
            const arr = filters[key] ?? [];
            const selected = type === 'reset' ? !hasActive : arr.length > 0;
            return (
              <Pill
                key={key}
                label={label}
                selected={selected}
                onPress={() => {
                  if (key === 'videos') {
                    navigation.navigate('ClassVaultLibrary');
                    setOpenDropdown(openDropdown === 'videos' ? null : 'videos');
                  } else if (type === 'dropdown') {
                    setOpenDropdown(openDropdown === key ? null : key);
                  } else if (type === 'reset') {
                    clearFilters();
                    setFilters(initialFilters);
                    setOpenDropdown(null);
                  } else {
                    toggleFilter(key, key);
                  }
                }}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Dropdown items */}
      {openDropdown && DROPDOWNS[openDropdown]?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw`bg-plum`}
          contentContainerStyle={tw`px-6 py-2 items-center`}
        >
          {openDropdown === 'videos'
            ? DROPDOWNS.videos.map(item => (
                <Pill
                  key={item}
                  label={item}
                  selected={filters.videos.includes(item)}
                  onPress={() => {
                    const nextKey = item === 'Subject' ? 'category' : 'ageGroup';
                    setOpenDropdown(nextKey as OptionKey);
                  }}
                />
              ))
            : DROPDOWNS[openDropdown].map(item => (
                <Pill
                  key={item}
                  label={item}
                  selected={(filters[openDropdown] ?? []).includes(item)}
                  onPress={() => toggleFilter(openDropdown, item)}
                />
              ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default NavbarNative;
