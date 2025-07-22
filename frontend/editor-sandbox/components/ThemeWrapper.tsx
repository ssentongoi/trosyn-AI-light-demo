import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';

interface ThemeWrapperProps {
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark';
}

const ThemeWrapper: React.FC<ThemeWrapperProps> = ({
  children,
  initialTheme = 'light',
}) => {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div className={`min-h-screen ${initialTheme === 'dark' ? 'dark' : ''}`}>
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default ThemeWrapper;
