// /apps/web/src/components/Sidebar.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useSidebarFilters } from '@shared/hooks/useSidebarFilters';

const Sidebar = ({ onFilterChange }) => {
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
    <div className="p-4 bg-plum text-white h-full w-64 shadow-lg overflow-y-auto custom-scrollbar">
      {/* Sidebar Header */}
      <div className="border-b border-softPink pb-6 mb-6 mt-8">
        <p className="text-lg text-pink-500 text-left mt-2">
          Find tutors by category and preferences
        </p>
      </div>

      {/* Main Links */}
      <div className="space-y-3">
        {['All Tutors', 'Free Session', 'My Favorites', 'My Recent Chats', 'Upcoming Classes'].map((section) => (
          <button
            key={section}
            onClick={() => handleFilterClick('section', section)}
            className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
              activeSection === section ? 'text-softPink font-semibold' : 'text-softGray'
            } hover:bg-softPink hover:bg-opacity-20 text-xl`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Collapsible Categories Section */}
      <div className="space-y-2 mt-6">
        <div
          onClick={() => setCategoriesOpen(!isCategoriesOpen)}
          className="text-xl font-semibold text-softPink uppercase tracking-wider cursor-pointer flex items-center justify-between py-1 text-left"
          aria-expanded={isCategoriesOpen}
        >
          <span>Subjects</span>
          <FontAwesomeIcon icon={isCategoriesOpen ? faChevronUp : faChevronDown} />
        </div>
        {isCategoriesOpen && (
          <div className="pl-0 space-y-2 transition-all duration-300 ease-in-out">
            {['Math Tutors', 'Sciences', 'Programming', 'Art & Design', 'Wellness', 'Languages'].map((category) => (
              <button
                key={category}
                onClick={() => handleFilterClick('category', category)}
                className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
                  activeSection === category ? 'text-softPink font-semibold' : 'text-softGray'
                } hover:bg-softPink hover:bg-opacity-20 text-xl`}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Collapsible Filters Section */}
      <div className="space-y-2 mt-6">
        <div
          onClick={() => setFiltersOpen(!isFiltersOpen)}
          className="text-xl font-semibold text-softPink uppercase tracking-wider cursor-pointer flex items-center justify-between py-1 text-left"
          aria-expanded={isFiltersOpen}
        >
          <span>Filters</span>
          <FontAwesomeIcon icon={isFiltersOpen ? faChevronUp : faChevronDown} />
        </div>
        {isFiltersOpen && (
          <div className="pl-2 space-y-6 transition-all duration-300 ease-in-out">
            {/* Experience Level */}
            <div>
              <h4 className="text-softGray text-lg font-semibold">Experience Level</h4>
              {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => (
                <button
                  key={level}
                  onClick={() => handleFilterClick('experienceLevel', level)}
                  className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
                    activeSection === level ? 'text-softPink font-semibold' : 'text-softGray'
                  } hover:bg-softPink hover:bg-opacity-20`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Teaching Style */}
            <div>
              <h4 className="text-softGray text-lg font-semibold">Teaching Style</h4>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    setSelectedTeachingStyle(style);
                    handleFilterClick('description.teachingStyle', style);
                  }}
                  className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
                    activeSection === style ? 'text-softPink font-semibold' : 'text-softGray'
                  } hover:bg-softPink hover:bg-opacity-20`}
                >
                  {style}
                </button>
              ))}
            </div>

            {/* Expertise */}
            <div>
              <h4 className="text-softGray text-lg font-semibold">Expertise</h4>
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((expertise) => (
                <button
                  key={expertise}
                  onClick={() => handleFilterClick('description.expertise', expertise, true)}
                  className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
                    activeSection === expertise ? 'text-softPink font-semibold' : 'text-softGray'
                  } hover:bg-softPink hover:bg-opacity-20`}
                >
                  {expertise}
                </button>
              ))}
            </div>

            {/* Age Group */}
            <div>
              <h4 className="text-softGray text-lg font-semibold">Age Group</h4>
              {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((ageGroup) => (
                <button
                  key={ageGroup}
                  onClick={() => handleFilterClick('ageGroup', ageGroup)}
                  className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
                    activeSection === ageGroup ? 'text-softPink font-semibold' : 'text-softGray'
                  } hover:bg-softPink hover:bg-opacity-20`}
                >
                  {ageGroup}
                </button>
              ))}
            </div>

            {/* Pricing */}
            <div>
              <h4 className="text-softGray text-lg font-semibold">Pricing</h4>
              {!selectedTeachingStyle && (
                <p className="text-sm text-red-400">Please select a Teaching Style first.</p>
              )}
              {['20-50', '51-100', '101-150', '151-200'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleFilterClick('pricing', range)}
                  className={`text-left w-full font-medium transition-colors duration-200 py-1 rounded ${
                    activeSection === range ? 'text-softPink font-semibold' : 'text-softGray'
                  } hover:bg-softPink hover:bg-opacity-20 ${
                    !selectedTeachingStyle ? 'cursor-not-allowed text-gray-400' : ''
                  }`}
                  disabled={!selectedTeachingStyle}
                >
                  {range} Tokens
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 192, 203, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
