// /packages/shared/hooks/useHomePage.ts
import { useState, useEffect } from 'react';
import { fetchTutorProfiles } from '../api/profileApi';
import { getBackendUrl } from "../utils/env";

export const useHomePage = () => {
   const backendUrl = getBackendUrl();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const tutors = await fetchTutorProfiles(backendUrl);
        setProfiles(tutors);
        setFilteredProfiles(tutors);
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [backendUrl]);

  const handleSearch = (searchTerm: string) => {
    const filtered = profiles.filter((profile) =>
      profile.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProfiles(filtered);
  };

  const onFilterChange = (filterType: string, value: string) => {
    let filtered;
    if (filterType === 'section') {
      if (value === 'All Tutors') {
        filtered = profiles;
      } else if (value === 'Free Session') {
        filtered = profiles.filter((profile) => profile.status === 'Free');
      } else {
        filtered = profiles.filter((profile) => profile.section === value);
      }
    } else if (filterType === 'category') {
      filtered = profiles.filter((profile) => profile.category === value);
    } else if (filterType === 'ageGroup') {
      filtered = profiles.filter((profile) => profile.ageGroup.includes(value));
    } else if (filterType === 'pricing') {
      const [min, max] = value.split('-').map(Number);
      filtered = profiles.filter(
        (profile) =>
          (profile.pricing.privateSession >= min &&
            profile.pricing.privateSession <= max) ||
          (profile.pricing.groupSession >= min &&
            profile.pricing.groupSession <= max) ||
          (profile.pricing.lecture >= min &&
            profile.pricing.lecture <= max) ||
          (profile.pricing.workshop >= min &&
            profile.pricing.workshop <= max)
      );
    } else if (
      ['experienceLevel', 'teachingStyle', 'specialties', 'languageFluency'].includes(filterType)
    ) {
      filtered = profiles.filter((profile) => profile[filterType] === value);
    } else {
      filtered = profiles;
    }
    setFilteredProfiles(filtered);
  };

  return {
    profiles,
    filteredProfiles,
    loading,
    isSidebarOpen,
    setSidebarOpen,
    handleSearch,
    onFilterChange,
  };
};
