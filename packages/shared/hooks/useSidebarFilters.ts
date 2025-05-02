import { useState } from 'react';

// Define the type for the filter change callback.
type FilterChangeHandler = (filterType: string, value: string, isNestedFilter?: boolean) => void;

const useSidebarFilters = (onFilterChange?: FilterChangeHandler) => {
  const [activeSection, setActiveSection] = useState<string>('All Tutors');
  const [isCategoriesOpen, setCategoriesOpen] = useState<boolean>(true);
  const [isFiltersOpen, setFiltersOpen] = useState<boolean>(true);
  const [selectedTeachingStyle, setSelectedTeachingStyle] = useState<string | null>(null);

  // Explicitly type the parameters for handleFilterClick.
  const handleFilterClick = (
    filterType: string,
    value: string,
    isNestedFilter: boolean = false
  ) => {
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

export default useSidebarFilters;
