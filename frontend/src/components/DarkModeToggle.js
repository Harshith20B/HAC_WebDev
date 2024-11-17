import React, { useState, useEffect } from 'react';

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setIsDarkMode(savedMode === 'true');
      if (savedMode === 'true') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative h-8 w-14 rounded-full p-1 
        transition-colors duration-300 focus:outline-none
        ${isDarkMode ? 'bg-gray-600 border-2 border-gray-400' : 'bg-gray-200 border-2 border-gray-300'}
      `}
    >
      <div
        className={`
          absolute top-0.5 
          transform transition-transform duration-300 ease-in-out
          w-6 h-6 rounded-full flex items-center justify-center
          ${isDarkMode 
            ? 'translate-x-6 bg-gray-900 shadow-[0_0_2px_2px_rgba(255,255,255,0.1)]' 
            : 'translate-x-0 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)]'}
        `}
      >
        {isDarkMode ? (
          <span className="material-icons text-sm text-yellow-400">dark_mode</span>
        ) : (
          <span className="material-icons text-sm text-yellow-500">light_mode</span>
        )}
      </div>
    </button>
  );
};

export default DarkModeToggle;