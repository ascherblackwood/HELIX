import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import NavigationRail from './components/NavigationRail';
import MainContent from './components/MainContent';
import { LDAPProvider } from './contexts/LDAPContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [currentPage, setCurrentPage] = useState('admin');

  return (
    <ThemeProvider>
      <LDAPProvider>
        <Router>
          <div className="flex h-screen themed-background">
            <NavigationRail 
              currentPage={currentPage} 
              onPageChange={setCurrentPage} 
            />
            <MainContent currentPage={currentPage} />
          </div>
        </Router>
      </LDAPProvider>
    </ThemeProvider>
  );
}

export default App;