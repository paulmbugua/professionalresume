import { useState, useEffect } from 'react';
import { fetchTutorProfiles } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';
import { MappedProfile } from '@mytutorapp/shared/types';

const useHomePage = () => {
  const { backendUrl } = useShopContext();
  const [profiles, setProfiles] = useState<MappedProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<MappedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const tutors = await fetchTutorProfiles(backendUrl);
        // Casting tutors to MappedProfile[] resolves the type error
        setProfiles(tutors as MappedProfile[]);
        setFilteredProfiles(tutors as MappedProfile[]);
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
      profile.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProfiles(filtered);
  };

  const onFilterChange = (filterType: string, value: string) => {
    let filtered: MappedProfile[] = [];

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
      filtered = profiles.filter((profile) => profile.ageGroup?.includes(value));
    } else if (filterType === 'pricing') {
      const [min, max] = value.split('-').map(Number);
      filtered = profiles.filter(
        (profile) =>
          ((profile.pricing?.privateSession ?? 0) >= min &&
            (profile.pricing?.privateSession ?? 0) <= max) ||
          ((profile.pricing?.groupSession ?? 0) >= min &&
            (profile.pricing?.groupSession ?? 0) <= max) ||
          ((profile.pricing?.lecture ?? 0) >= min &&
            (profile.pricing?.lecture ?? 0) <= max) ||
          ((profile.pricing?.workshop ?? 0) >= min &&
            (profile.pricing?.workshop ?? 0) <= max)
      );
    } else if (
      ['experienceLevel', 'teachingStyle', 'specialties', 'languageFluency'].includes(filterType)
    ) {
      const key = filterType as keyof MappedProfile;
      filtered = profiles.filter((profile) => profile[key] === value);
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

export default useHomePage;
