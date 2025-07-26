import React, { useState, useEffect } from 'react';
import { BookOpen, Download, ArrowLeft, Calendar, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { supabase } from '../../lib/supabase';
import { Course } from '../../types';

interface CoursesPageProps {
  onBack: () => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { getUserSession } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    loadUserSessionAndCourses();
  }, [user]);

  const loadUserSessionAndCourses = async () => {
    if (!user) return;

    try {
      // Get user's session
      const session = await getUserSession(user.id);
      setUserSession(session);

      if (session) {
        // Load courses for the user's session
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading courses:', error);
          return;
        }

        const courseData: Course[] = data.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          sessionId: item.session_id,
          createdBy: item.created_by,
          createdAt: item.created_at,
        }));

        setCourses(courseData);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCourse = (course: Course) => {
    const blob = new Blob([course.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.title}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Mes Cours</h1>
        </div>

        {!userSession ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune séance assignée</h2>
            <p className="text-gray-600">
              Vous devez être inscrit(e) à une séance pour accéder aux cours.
            </p>
          </div>
        ) : (
          <>
            {/* Session Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-blue-500">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Votre Séance</h2>
              <div className="flex items-center text-gray-700">
                <Calendar className="h-5 w-5 mr-2" />
                <span>{userSession.day} - {userSession.time}</span>
              </div>
            </div>

            {/* Courses List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Cours Disponibles ({courses.length})
              </h2>
              
              {courses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Aucun cours disponible</p>
                  <p className="text-gray-400">Les cours seront ajoutés par votre professeur</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {course.title}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <User className="h-4 w-4 mr-1" />
                            <span>Professeur</span>
                            <span className="mx-2">•</span>
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>
                              {new Date(course.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadCourse(course)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition duration-200"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </button>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {course.content.length > 300 
                            ? `${course.content.substring(0, 300)}...` 
                            : course.content
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};