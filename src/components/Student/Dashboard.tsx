import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, MessageCircle, Calendar, User, LogOut } from 'lucide-react';
import { AttendancePage } from './AttendancePage';
import { CoursesPage } from './CoursesPage';
import { QuestionsPage } from './QuestionsPage';

type TabType = 'attendance' | 'courses' | 'questions';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('attendance');

  const handleLogout = () => {
    logout();
  };

  const tabs = [
    { id: 'attendance' as TabType, label: 'Présence', icon: Calendar },
    { id: 'courses' as TabType, label: 'Cours', icon: BookOpen },
    { id: 'questions' as TabType, label: 'Questions', icon: MessageCircle },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'attendance':
        return <AttendancePage />;
      case 'courses':
        return <CoursesPage />;
      case 'questions':
        return <QuestionsPage />;
      default:
        return <AttendancePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">École Bolbol</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-2" />
                <span>{user?.first_name} {user?.last_name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
}