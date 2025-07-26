import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Attendance } from '../../types';

interface AttendancePageProps {
  onBack: () => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendances();
  }, [user]);

  const loadAttendances = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error loading attendances:', error);
        return;
      }

      const attendanceData: Attendance[] = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        sessionId: item.session_id,
        date: item.date,
        isPresent: item.is_present,
        createdAt: item.created_at,
      }));

      setAttendances(attendanceData);
    } catch (error) {
      console.error('Error loading attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSessions = attendances.length;
  const presentSessions = attendances.filter(a => a.isPresent).length;
  const absentSessions = totalSessions - presentSessions;
  const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-700 transition duration-200 mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Suivi des Présences</h1>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Séances</p>
                <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Présences</p>
                <p className="text-2xl font-bold text-gray-900">{presentSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Absences</p>
                <p className="text-2xl font-bold text-gray-900">{absentSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Taux de Présence</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Historique des Présences</h2>
          
          {attendances.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune donnée de présence disponible</p>
              <p className="text-gray-400">Les présences seront enregistrées lors des séances</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    attendance.isPresent
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center">
                    {attendance.isPresent ? (
                      <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(attendance.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        Session: {attendance.sessionId}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    attendance.isPresent
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attendance.isPresent ? 'Présent(e)' : 'Absent(e)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};