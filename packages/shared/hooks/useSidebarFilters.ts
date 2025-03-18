// /packages/shared/hooks/useSidebarFilters.ts
import { useState } from 'react';

export const useSidebarFilters = (onFilterChange) => {
  const [activeSection, setActiveSection] = useState('All Tutors');
  const [isCategoriesOpen, setCategoriesOpen] = useState(true);
  const [isFiltersOpen, setFiltersOpen] = useState(true);
  const [selectedTeachingStyle, setSelectedTeachingStyle] = useState(null);

  const handleFilterClick = (filterType, value, isNestedFilter = false) => {
    if (onFilterChange) {
      onFilterChange(filterType, value, isNestedFilter);
    }
    setActiveSection(value);
  };

  return {
    activeSection,
    isCategoriesOpen,
    setCategoriesOpen,
    isFiltersOpen,
    setFiltersOpen,
    selectedTeachingStyle,
    setSelectedTeachingStyle,
    handleFilterClick,
  };
};
