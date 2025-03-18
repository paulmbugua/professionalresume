// /apps/mobile/src/screens/Sidebar.native.tsx
import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useSidebarFilters } from '@shared/hooks/useSidebarFilters';

interface SidebarProps {
  onFilterChange: (filterType: string, value: string, optional?: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onFilterChange }) => {
  // useSidebarFilters now receives the onFilterChange prop
  const {
    activeSection,
    isCategoriesOpen,
    setCategoriesOpen,
    isFiltersOpen,
    setFiltersOpen,
    selectedTeachingStyle,
    setSelectedTeachingStyle,
    handleFilterClick,
    // For example, assume pricing is now a Record<string, string>
    pricing,
  } = useSidebarFilters(onFilterChange);

  return (
    <ScrollView style={styles.container}>
      {/* Sidebar Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Find tutors by category and preferences</Text>
      </View>

      {/* Main Links */}
      {['All Tutors', 'Free Session', 'My Favorites', 'My Recent Chats', 'Upcoming Classes'].map((section) => (
        <TouchableOpacity
          key={section}
          onPress={() => handleFilterClick('section', section)}
          style={[
            styles.link,
            activeSection === section && styles.activeLink,
          ]}
        >
          <Text style={activeSection === section ? styles.activeText : styles.inactiveText}>
            {section}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Collapsible Categories Section */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => setCategoriesOpen(!isCategoriesOpen)} style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Subjects</Text>
          <FontAwesomeIcon icon={isCategoriesOpen ? faChevronUp : faChevronDown} size={16} color="#F472B6" />
        </TouchableOpacity>
        {isCategoriesOpen && (
          <View style={styles.sectionContent}>
            {['Math Tutors', 'Sciences', 'Programming', 'Art & Design', 'Wellness', 'Languages'].map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => handleFilterClick('category', category)}
                style={[
                  styles.link,
                  activeSection === category && styles.activeLink,
                ]}
              >
                <Text style={activeSection === category ? styles.activeText : styles.inactiveText}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Collapsible Filters Section */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => setFiltersOpen(!isFiltersOpen)} style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Filters</Text>
          <FontAwesomeIcon icon={isFiltersOpen ? faChevronUp : faChevronDown} size={16} color="#F472B6" />
        </TouchableOpacity>
        {isFiltersOpen && (
          <View style={styles.sectionContent}>
            {/* Experience Level */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Experience Level</Text>
              {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => handleFilterClick('experienceLevel', level)}
                  style={[
                    styles.link,
                    activeSection === level && styles.activeLink,
                  ]}
                >
                  <Text style={activeSection === level ? styles.activeText : styles.inactiveText}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Teaching Style */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Teaching Style</Text>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <TouchableOpacity
                  key={style}
                  onPress={() => {
                    setSelectedTeachingStyle(style);
                    handleFilterClick('description.teachingStyle', style);
                  }}
                  style={[
                    styles.link,
                    activeSection === style && styles.activeLink,
                  ]}
                >
                  <Text style={activeSection === style ? styles.activeText : styles.inactiveText}>
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Expertise */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Expertise</Text>
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((exp) => (
                <TouchableOpacity
                  key={exp}
                  onPress={() => handleFilterClick('description.expertise', exp, true)}
                  style={[
                    styles.link,
                    activeSection === exp && styles.activeLink,
                  ]}
                >
                  <Text style={activeSection === exp ? styles.activeText : styles.inactiveText}>
                    {exp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Age Group */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Age Group</Text>
              {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((group) => (
                <TouchableOpacity
                  key={group}
                  onPress={() => handleFilterClick('ageGroup', group)}
                  style={[
                    styles.link,
                    activeSection === group && styles.activeLink,
                  ]}
                >
                  <Text style={activeSection === group ? styles.activeText : styles.inactiveText}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Pricing</Text>
              {/*
                If your pricing state is defined as an object (for example, Record<string, string>),
                then make sure its type allows string indexing. If not, update your hook accordingly.
              */}
              {['20-50', '51-100', '101-150', '151-200'].map((range) => (
                <TouchableOpacity
                  key={range}
                  onPress={() => handleFilterClick('pricing', range)}
                  disabled={false}
                  style={[
                    styles.link,
                    activeSection === range && styles.activeLink,
                  ]}
                >
                  <Text style={activeSection === range ? styles.activeText : styles.inactiveText}>
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

const styles = StyleSheet.create({
  container: { backgroundColor: '#6B21A8', padding: 16, width: 256 },
  header: { borderBottomWidth: 1, borderBottomColor: '#F472B6', paddingBottom: 16, marginBottom: 16, marginTop: 32 },
  headerText: { fontSize: 18, color: '#F472B6' },
  link: { paddingVertical: 8 },
  activeLink: {},
  activeText: { color: '#F472B6', fontWeight: '600', fontSize: 18 },
  inactiveText: { color: '#A3A3A3', fontSize: 18 },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  sectionHeaderText: { fontSize: 18, color: '#F472B6', fontWeight: '600', textTransform: 'uppercase' },
  sectionContent: { paddingLeft: 8 },
  filterGroup: { marginTop: 16 },
  filterGroupTitle: { fontSize: 16, color: '#A3A3A3', fontWeight: '600', marginBottom: 8 },
});

export default Sidebar;
