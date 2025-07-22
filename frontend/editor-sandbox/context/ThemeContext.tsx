import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode; initialTheme?: Theme }> = ({
  children,
  initialTheme = 'light',
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Toggle between light and dark theme
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Apply theme class to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper function to get theme class names
export const getThemeClasses = (theme: Theme) => ({
  bg: `bg-${theme === 'dark' ? 'gray-900' : 'white'}`,
  hover: `hover:bg-${theme === 'dark' ? 'gray-700' : 'gray-100'}`,
  border: `border-${theme === 'dark' ? 'gray-700' : 'gray-200'}`,
  text: `text-${theme === 'dark' ? 'white' : 'gray-900'}`,
  'text-secondary': `text-${theme === 'dark' ? 'gray-300' : 'gray-600'}`,
  'bg-secondary': `bg-${theme === 'dark' ? 'gray-800' : 'gray-50'}`,
});

export default ThemeContext;
