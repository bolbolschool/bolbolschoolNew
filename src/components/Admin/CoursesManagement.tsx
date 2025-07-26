import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Plus, Send, Trash2, Download, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { supabase } from '../../lib/supabase';
import { Course } from '../../types';

interface CoursesManagementProps {
  onBack: () => void;
}

export const CoursesManagement: React.FC<CoursesManagementProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { sessions } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseContent, setNewCourseContent] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
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
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCourse = async () => {
    if (!user || !newCourseTitle.trim() || !newCourseContent.trim() || !selectedSession) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .insert({
          title: newCourseTitle.trim(),
          content: newCourseContent.trim(),
          session_id: selectedSession,
          created_by: user.id,
        });

      if (error) {
        console.error('Error creating course:', error);
        alert('Erreur lors de la création du cours');
        return;
      }

      setNewCourseTitle('');
      setNewCourseContent('');
      setSelectedSession('');
      setShowNewCourse(false);
      await loadCourses();
      alert('Cours créé avec succès!');
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Erreur lors de la création du cours');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Error deleting course:', error);
        alert('Erreur lors de la suppression du cours');
        return;
      }

      await loadCourses();
      alert('Cours supprimé avec succès!');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Erreur lors de la suppression du cours');
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

  const getSessionName = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    return session ? `${session.day} - ${session.time}` : 'Session inconnue';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Cours</h1>
          </div>
          <button
            onClick={() => setShowNewCourse(!showNewCourse)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Cours
          </button>
        </div>

        {/* New Course Form */}
        {showNewCourse && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer un nouveau cours</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Séance destinataire
                </label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner une séance</option>
                  {sessions.filter(s => s.isActive).map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.day} - {session.time} ({session.enrollmentCount || 0} étudiants)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du cours
                </label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Introduction à la microéconomie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenu du cours
                </label>
                <textarea
                  value={newCourseContent}
                  onChange={(e) => setNewCourseContent(e.target.value)}
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rédigez le contenu de votre cours ici..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowNewCourse(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitCourse}
                  disabled={!newCourseTitle.trim() || !newCourseContent.trim() || !selectedSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center transition duration-200 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publier le cours
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Courses List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Cours Publiés ({courses.length})
          </h2>
          
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucun cours publié</p>
              <p className="text-gray-400">Créez votre premier cours pour vos étudiants</p>
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
                      <div className="flex items-center text-sm text-gray-600 mb-3 space-x-4">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{getSessionName(course.sessionId)}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {new Date(course.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadCourse(course)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center transition duration-200"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center transition duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {course.content.length > 500 
                        ? `${course.content.substring(0, 500)}...` 
                        : course.content
                      }
                    </p>
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