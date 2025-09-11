import React from 'react';
import AdminPage from '../pages/AdminPage';
import UsersPage from '../pages/UsersPage';
import ComputersPage from '../pages/ComputersPage';
import GroupsPage from '../pages/GroupsPage';
import ReportsPage from '../pages/ReportsPage';
import InventoryPage from '../pages/InventoryPage';
import KnowledgeBasePage from '../pages/KnowledgeBasePage';
import SettingsPage from '../pages/SettingsPage';

const MainContent = ({ currentPage }) => {
  const renderPage = () => {
    switch (currentPage) {
      case 'admin':
        return <AdminPage />;
      case 'users':
        return <UsersPage />;
      case 'computers':
        return <ComputersPage />;
      case 'groups':
        return <GroupsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'knowledge':
        return <KnowledgeBasePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <AdminPage />;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {renderPage()}
    </div>
  );
};

export default MainContent;
