import React, { useState, useEffect } from 'react';
import { BookOpen, LogOut, Users, Calendar, Trash2, Download, UserCheck, Plus, Edit, Eye, EyeOff, ArrowRight, FileText, HelpCircle, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { AttendanceManagement } from './AttendanceManagement';
import { CoursesManagement } from './CoursesManagement';
import { QuestionsManagement } from './QuestionsManagement';
import { User } from '../../types';
import { supabase } from '../../lib/supabase';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { sessions, removeFromSession, addSession, deleteSession, toggleSessionStatus, moveStudentToSession, getSessionStudents, enrollInSession, refreshSessions } = useSession();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionDay, setNewSessionDay] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [moveStudentMode, setMoveStudentMode] = useState<{studentId: string, fromSessionId: string} | null>(null);
  const [assignStudentMode, setAssignStudentMode] = useState<{studentId: string} | null>(null);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [sessionStudents, setSessionStudents] = useState<Record<string, User[]>>({});
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'attendance' | 'courses' | 'questions'>('dashboard');

  // Load all students and their enrollments
  const loadStudentsData = async () => {
    try {
      // Get all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student');

      if (studentsError) {
        console.error('Error loading students:', studentsError);
        return;
      }

      const students: User[] = studentsData.map(student => ({
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        role: student.role,
        createdAt: student.created_at,
      }));

      setAllStudents(students);

      // Get all enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('user_id, session_id');

      if (enrollmentsError) {
        console.error('Error loading enrollments:', enrollmentsError);
        return;
      }

      // Find unassigned students
      const assignedStudentIds = enrollmentsData.map(e => e.user_id);
      const unassigned = students.filter(student => !assignedStudentIds.includes(student.id));
      setUnassignedStudents(unassigned);

      // Load students for each session
      const sessionStudentsMap: Record<string, User[]> = {};
      for (const session of sessions) {
        const students = await getSessionStudents(session.id);
        sessionStudentsMap[session.id] = students;
      }
      setSessionStudents(sessionStudentsMap);

    } catch (error) {
      console.error('Error loading students data:', error);
    }
  };

  useEffect(() => {
    loadStudentsData();
  }, [sessions]);

  const handleRemoveStudent = async (sessionId: string, studentId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet étudiant de la séance ?')) {
      const success = await removeFromSession(sessionId, studentId);
      if (success) {
        await loadStudentsData();
        await refreshSessions();
      }
    }
  };

  const handleAssignStudent = async (sessionId: string) => {
    if (!assignStudentMode) return;

    try {
      const success = await enrollInSession(sessionId, assignStudentMode.studentId);
      if (success) {
        alert('Étudiant assigné avec succès');
        setAssignStudentMode(null);
        await loadStudentsData();
        await refreshSessions();
      } else {
        alert('Impossible d\'assigner l\'étudiant. Vérifiez que la séance n\'est pas complète.');
      }
    } catch (error) {
      console.error('Error assigning student:', error);
      alert('Erreur lors de l\'assignation de l\'étudiant');
    }
  };

  const handleAddSession = async () => {
    if (!newSessionDay || !newSessionTime) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    // Validate time format (should be like 08h00, 10h00, etc.)
    const timeRegex = /^\d{2}h\d{2}$/;
    if (!timeRegex.test(newSessionTime)) {
      alert('Format d\'heure invalide. Utilisez le format: 08h00, 10h00, etc.');
      return;
    }

    try {
      const success = await addSession(newSessionDay, newSessionTime);
      if (success) {
        setNewSessionDay('');
        setNewSessionTime('');
        setShowAddSession(false);
        alert('Séance ajoutée avec succès');
        await loadStudentsData();
      } else {
        alert('Cette séance existe déjà ou il y a eu un problème');
      }
    } catch (error) {
      console.error('Error adding session:', error);
      alert('Erreur lors de l\'ajout de la séance');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.')) {
      const success = await deleteSession(sessionId);
      if (success) {
        alert('Séance supprimée avec succès');
        await loadStudentsData();
      }
    }
  };

  const handleToggleSessionStatus = async (sessionId: string) => {
    await toggleSessionStatus(sessionId);
  };

  const handleMoveStudent = async (toSessionId: string) => {
    if (!moveStudentMode) return;

    const success = await moveStudentToSession(
      moveStudentMode.studentId,
      moveStudentMode.fromSessionId,
      toSessionId
    );

    if (success) {
      alert('Étudiant déplacé avec succès');
      setMoveStudentMode(null);
      await loadStudentsData();
      await refreshSessions();
    } else {
      alert('Impossible de déplacer l\'étudiant. La séance de destination est peut-être complète.');
    }
  };

  const exportToCSV = () => {
    const csvContent = sessions.map(session => {
      const students = sessionStudents[session.id] || [];
      return students.map(student => 
        `"${session.day}","${session.time}","${student.firstName}","${student.lastName}","${student.email}"`
      ).join('\n');
    }).filter(Boolean).join('\n');
    
    const header = 'Jour,Heure,Prénom,Nom,Email\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'liste_etudiants.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (currentPage === 'attendance') {
    return <AttendanceManagement onBack={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'courses') {
    return <CoursesManagement onBack={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'questions') {
    return <QuestionsManagement onBack={() => setCurrentPage('dashboard')} />;
  }

  const totalStudents = Object.values(sessionStudents).reduce((sum, students) => sum + students.length, 0);
  const fullSessions = sessions.filter(session => (session.enrollmentCount || 0) >= session.maxCapacity && session.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Administration</h1>
                <p className="text-sm text-gray-600">Gestion des séances d'étude</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Bonjour, {user?.firstName} {user?.lastName}</span>
              <button
                onClick={logout}
                className="flex items-center text-gray-600 hover:text-gray-900 transition duration-200"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Menu */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition duration-200"
            >
              <BookOpen className="h-6 w-6 text-purple-600 mr-2" />
              <span className="font-medium text-purple-800">Tableau de bord</span>
            </button>
            <button
              onClick={() => setCurrentPage('attendance')}
              className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition duration-200"
            >
              <ClipboardCheck className="h-6 w-6 text-green-600 mr-2" />
              <span className="font-medium text-green-800">Gestion Présences</span>
            </button>
            <button
              onClick={() => setCurrentPage('courses')}
              className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition duration-200"
            >
              <FileText className="h-6 w-6 text-blue-600 mr-2" />
              <span className="font-medium text-blue-800">Gestion Cours</span>
            </button>
            <button
              onClick={() => setCurrentPage('questions')}
              className="flex items-center justify-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition duration-200"
            >
              <HelpCircle className="h-6 w-6 text-orange-600 mr-2" />
              <span className="font-medium text-orange-800">Questions</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total des étudiants</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Séances disponibles</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Séances complètes</p>
                <p className="text-2xl font-bold text-gray-900">{fullSessions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center transition duration-200"
          >
            <Download className="h-5 w-5 mr-2" />
            Exporter la liste (CSV)
          </button>
          <button
            onClick={() => setShowAddSession(!showAddSession)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter une séance
          </button>
          <button
            onClick={() => setShowAllStudents(!showAllStudents)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center transition duration-200"
          >
            <Users className="h-5 w-5 mr-2" />
            Voir tous les étudiants
          </button>
        </div>

        {/* Add Session Form */}
        {showAddSession && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter une nouvelle séance</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jour</label>
                <select
                  value={newSessionDay}
                  onChange={(e) => setNewSessionDay(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un jour</option>
                  <option value="Lundi">Lundi</option>
                  <option value="Mardi">Mardi</option>
                  <option value="Mercredi">Mercredi</option>
                  <option value="Jeudi">Jeudi</option>
                  <option value="Vendredi">Vendredi</option>
                  <option value="Samedi">Samedi</option>
                  <option value="Dimanche">Dimanche</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heure</label>
                <input
                  type="text"
                  value={newSessionTime}
                  onChange={(e) => setNewSessionTime(e.target.value)}
                  placeholder="ex: 08h00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unassigned Students */}
        {unassignedStudents.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-orange-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Étudiants non assignés ({unassignedStudents.length})
            </h2>
            <div className="grid gap-3">
              {unassignedStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                  <button
                    onClick={() => setAssignStudentMode({studentId: student.id})}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  >
                    Assigner
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Students View */}
        {showAllStudents && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tous les étudiants ({allStudents.length})</h2>
            <div className="grid gap-3">
              {allStudents.map((student) => {
                const isAssigned = !unassignedStudents.find(u => u.id === student.id);
                const studentSession = sessions.find(s => sessionStudents[s.id]?.find(st => st.id === student.id));
                
                return (
                  <div key={student.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                    </div>
                    <div className="text-right">
                      {studentSession ? (
                        <div>
                          <p className="text-sm font-medium text-green-600">
                            {studentSession.day} - {studentSession.time}
                          </p>
                          <button
                            onClick={() => setMoveStudentMode({studentId: student.id, fromSessionId: studentSession.id})}
                            className="text-blue-600 hover:text-blue-700 text-sm transition duration-200"
                          >
                            Déplacer
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssignStudentMode({studentId: student.id})}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition duration-200"
                        >
                          Assigner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Assign Student Modal */}
        {assignStudentMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assigner l'étudiant à une séance
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessions
                  .filter(s => (s.enrollmentCount || 0) < s.maxCapacity && s.isActive)
                  .map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleAssignStudent(session.id)}
                      className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-500 transition duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span>{session.day} - {session.time}</span>
                        <span className="text-sm text-gray-500">
                          {session.enrollmentCount || 0}/{session.maxCapacity}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setAssignStudentMode(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Move Student Modal */}
        {moveStudentMode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Déplacer l'étudiant vers une autre séance
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessions
                  .filter(s => s.id !== moveStudentMode.fromSessionId && (s.enrollmentCount || 0) < s.maxCapacity && s.isActive)
                  .map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleMoveStudent(session.id)}
                      className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <span>{session.day} - {session.time}</span>
                        <span className="text-sm text-gray-500">
                          {session.enrollmentCount || 0}/{session.maxCapacity}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setMoveStudentMode(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vue d'ensemble des séances</h2>
          
          <div className="grid gap-4">
            {sessions.map((session) => {
              const students = sessionStudents[session.id] || [];
              const isFull = (session.enrollmentCount || 0) >= session.maxCapacity;
              
              return (
                <div
                  key={session.id}
                  className={`border rounded-lg p-4 transition duration-200 ${
                    !session.isActive ? 'border-gray-300 bg-gray-50 opacity-60' :
                    isFull ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                      <span className="font-medium text-gray-900">
                        {session.day} - {session.time}
                      </span>
                      {!session.isActive && (
                        <span className="ml-2 text-xs bg-gray-500 text-white px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm font-medium ${
                        !session.isActive ? 'text-gray-500' :
                        isFull ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {session.enrollmentCount || 0}/{session.maxCapacity} étudiants
                      </span>
                      <button
                        onClick={() => handleToggleSessionStatus(session.id)}
                        className={`p-1 rounded transition duration-200 ${
                          session.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        title={session.isActive ? 'Désactiver la séance' : 'Activer la séance'}
                      >
                        {session.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition duration-200"
                        title="Supprimer la séance"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedSession(selectedSession === session.id ? '' : session.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium transition duration-200"
                      >
                        {selectedSession === session.id ? 'Masquer' : 'Voir détails'}
                      </button>
                    </div>
                  </div>

                  {selectedSession === session.id && (
                    <div className="border-t pt-4 mt-4">
                      {students.length > 0 ? (
                        <div className="space-y-2">
                          {students.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                                <p className="text-sm text-gray-600">{student.email}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setMoveStudentMode({studentId: student.id, fromSessionId: session.id})}
                                  className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition duration-200"
                                  title="Déplacer cet étudiant"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveStudent(session.id, student.id)}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition duration-200"
                                  title="Supprimer cet étudiant"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">Aucun étudiant inscrit</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};