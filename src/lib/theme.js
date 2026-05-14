import React from 'react';

const ThemeContext = React.createContext(null);

export const ThemeProvider = ({ children }) => {
  // Theme is now permanently 'dark'
  const value = React.useMemo(
    () => ({
      theme: 'dark',
      isLightTheme: false,
      toggleTheme: () => {}, // No-op
      setTheme: () => {},    // No-op
    }),
    [],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
