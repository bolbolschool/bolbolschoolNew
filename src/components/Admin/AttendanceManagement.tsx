import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Users, CheckCircle, XCircle, Save, Download } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { supabase } from '../../lib/supabase';
import { User, Attendance } from '../../types';

interface AttendanceManagementProps {
  onBack: () => void;
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ onBack }) => {
  const { sessions, getSessionStudents } = useSession();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sessionStudents, setSessionStudents] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      loadSessionStudents();
      loadExistingAttendance();
    }
  }, [selectedSession, selectedDate]);

  const loadSessionStudents = async () => {
    if (!selectedSession) return;

    try {
      const students = await getSessionStudents(selectedSession);
      setSessionStudents(students);
      
      // Initialize attendance state
      const initialAttendance: Record<string, boolean> = {};
      students.forEach(student => {
        initialAttendance[student.id] = false;
      });
      setAttendances(initialAttendance);
    } catch (error) {
      console.error('Error loading session students:', error);
    }
  };

  const loadExistingAttendance = async () => {
    if (!selectedSession || !selectedDate) return;

    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('user_id, is_present')
        .eq('session_id', selectedSession)
        .eq('date', selectedDate);

      if (error) {
        console.error('Error loading existing attendance:', error);
        return;
      }

      if (data && data.length > 0) {
        setHasExistingAttendance(true);
        const existingAttendance: Record<string, boolean> = {};
        data.forEach(record => {
          existingAttendance[record.user_id] = record.is_present;
        });
        setAttendances(prev => ({ ...prev, ...existingAttendance }));
      } else {
        setHasExistingAttendance(false);
      }
    } catch (error) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendances(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const saveAttendance = async () => {
    if (!selectedSession || !selectedDate) return;

    setLoading(true);
    try {
      // Delete existing attendance for this session and date
      await supabase
        .from('attendances')
        .delete()
        .eq('session_id', selectedSession)
        .eq('date', selectedDate);

      // Insert new attendance records
      const attendanceRecords = sessionStudents.map(student => ({
        user_id: student.id,
        session_id: selectedSession,
        date: selectedDate,
        is_present: attendances[student.id] || false,
      }));

      const { error } = await supabase
        .from('attendances')
        .insert(attendanceRecords);

      if (error) {
        console.error('Error saving attendance:', error);
        alert('Erreur lors de la sauvegarde des présences');
        return;
      }

      alert('Présences sauvegardées avec succès!');
      setHasExistingAttendance(true);
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Erreur lors de la sauvegarde des présences');
    } finally {
      setLoading(false);
    }
  };

  const exportAttendance = () => {
    if (!selectedSession || sessionStudents.length === 0) return;

    const session = sessions.find(s => s.id === selectedSession);
    const csvContent = sessionStudents.map(student => 
      `"${student.firstName}","${student.lastName}","${student.email}","${attendances[student.id] ? 'Présent' : 'Absent'}"`
    ).join('\n');
    
    const header = 'Prénom,Nom,Email,Statut\n';
    const blob = new Blob([header + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presence_${session?.day}_${session?.time}_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const presentCount = Object.values(attendances).filter(Boolean).length;
  const absentCount = sessionStudents.length - presentCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center text-purple-600 hover:text-purple-700 transition duration-200 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Présences</h1>
          </div>
        </div>

        {/* Session and Date Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner une séance
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Choisir une séance</option>
                {sessions.filter(s => s.isActive).map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.day} - {session.time} ({session.enrollmentCount || 0} étudiants)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              {selectedSession && sessionStudents.length > 0 && (
                <button
                  onClick={exportAttendance}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition duration-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedSession && sessionStudents.length > 0 && (
          <>
            {/* Statistics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Total Étudiants</p>
                    <p className="text-2xl font-bold text-gray-900">{sessionStudents.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Présents</p>
                    <p className="text-2xl font-bold text-gray-900">{presentCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Absents</p>
                    <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Appel - {sessions.find(s => s.id === selectedSession)?.day} {sessions.find(s => s.id === selectedSession)?.time}
                </h2>
                <div className="flex items-center space-x-4">
                  {hasExistingAttendance && (
                    <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full">
                      ✓ Présences déjà enregistrées
                    </span>
                  )}
                  <button
                    onClick={saveAttendance}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center transition duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Sauvegarder
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {sessionStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition duration-200 ${
                      attendances[student.id]
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="mr-4">
                        <p className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleAttendance(student.id)}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition duration-200 ${
                          attendances[student.id]
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {attendances[student.id] ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Présent
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Absent
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedSession && sessionStudents.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun étudiant inscrit</h2>
            <p className="text-gray-600">
              Cette séance n'a pas encore d'étudiants inscrits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};