import React, { useState, useEffect } from 'react';
import { HelpCircle, Send, ArrowLeft, MessageCircle, ThumbsUp, CheckCircle, User, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { supabase } from '../../lib/supabase';
import { Question, QuestionInteraction } from '../../types';

interface QuestionsPageProps {
  onBack: () => void;
}

export const QuestionsPage: React.FC<QuestionsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { getUserSession } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [interactions, setInteractions] = useState<Record<string, QuestionInteraction[]>>({});
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionContent, setNewQuestionContent] = useState('');

  useEffect(() => {
    loadUserSessionAndQuestions();
  }, [user]);

  const loadUserSessionAndQuestions = async () => {
    if (!user) return;

    try {
      // Get user's session
      const session = await getUserSession(user.id);
      setUserSession(session);

      if (session) {
        // Load questions for the user's session
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false });

        if (questionsError) {
          console.error('Error loading questions:', questionsError);
          return;
        }

        const questionData: Question[] = questionsData.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          sessionId: item.session_id,
          askedBy: item.asked_by,
          askedByName: item.asked_by_name,
          answeredBy: item.answered_by,
          answeredByName: item.answered_by_name,
          answer: item.answer,
          createdAt: item.created_at,
          answeredAt: item.answered_at,
        }));

        setQuestions(questionData);

        // Load interactions for each question
        const interactionsMap: Record<string, QuestionInteraction[]> = {};
        for (const question of questionData) {
          const { data: interactionsData } = await supabase
            .from('question_interactions')
            .select('*')
            .eq('question_id', question.id);

          if (interactionsData) {
            interactionsMap[question.id] = interactionsData.map(item => ({
              id: item.id,
              questionId: item.question_id,
              userId: item.user_id,
              userName: item.user_name,
              type: item.type,
              createdAt: item.created_at,
            }));
          }
        }
        setInteractions(interactionsMap);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!user || !userSession || !newQuestionTitle.trim() || !newQuestionContent.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .insert({
          title: newQuestionTitle.trim(),
          content: newQuestionContent.trim(),
          session_id: userSession.id,
          asked_by: user.id,
          asked_by_name: `${user.firstName} ${user.lastName}`,
        });

      if (error) {
        console.error('Error submitting question:', error);
        alert('Erreur lors de l\'envoi de la question');
        return;
      }

      setNewQuestionTitle('');
      setNewQuestionContent('');
      setShowNewQuestion(false);
      await loadUserSessionAndQuestions();
      alert('Question envoyée avec succès!');
    } catch (error) {
      console.error('Error submitting question:', error);
      alert('Erreur lors de l\'envoi de la question');
    }
  };

  const handleInteraction = async (questionId: string, type: 'like' | 'helpful') => {
    if (!user) return;

    try {
      // Check if user already interacted with this type
      const existingInteraction = interactions[questionId]?.find(
        i => i.userId === user.id && i.type === type
      );

      if (existingInteraction) {
        // Remove interaction
        await supabase
          .from('question_interactions')
          .delete()
          .eq('id', existingInteraction.id);
      } else {
        // Add interaction
        await supabase
          .from('question_interactions')
          .insert({
            question_id: questionId,
            user_id: user.id,
            user_name: `${user.firstName} ${user.lastName}`,
            type: type,
          });
      }

      await loadUserSessionAndQuestions();
    } catch (error) {
      console.error('Error handling interaction:', error);
    }
  };

  const getInteractionCount = (questionId: string, type: 'like' | 'helpful') => {
    return interactions[questionId]?.filter(i => i.type === type).length || 0;
  };

  const hasUserInteracted = (questionId: string, type: 'like' | 'helpful') => {
    return interactions[questionId]?.some(i => i.userId === user?.id && i.type === type) || false;
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center text-blue-600 hover:text-blue-700 transition duration-200 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Questions & Réponses</h1>
          </div>
          {userSession && (
            <button
              onClick={() => setShowNewQuestion(!showNewQuestion)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center transition duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Poser une question
            </button>
          )}
        </div>

        {!userSession ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <HelpCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune séance assignée</h2>
            <p className="text-gray-600">
              Vous devez être inscrit(e) à une séance pour poser des questions.
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

            {/* New Question Form */}
            {showNewQuestion && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-green-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Poser une nouvelle question</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de la question
                    </label>
                    <input
                      type="text"
                      value={newQuestionTitle}
                      onChange={(e) => setNewQuestionTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Comment calculer l'élasticité de la demande ?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Détails de la question
                    </label>
                    <textarea
                      value={newQuestionContent}
                      onChange={(e) => setNewQuestionContent(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Décrivez votre question en détail..."
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowNewQuestion(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSubmitQuestion}
                      disabled={!newQuestionTitle.trim() || !newQuestionContent.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center transition duration-200 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Questions List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Questions de la séance ({questions.length})
              </h2>
              
              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Aucune question posée</p>
                  <p className="text-gray-400">Soyez le premier à poser une question!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-200"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {question.title}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <User className="h-4 w-4 mr-1" />
                            <span>{question.askedByName}</span>
                            <span className="mx-2">•</span>
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>
                              {new Date(question.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-4">{question.content}</p>
                        </div>
                      </div>

                      {/* Answer */}
                      {question.answer ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                            <span className="font-medium text-green-800">
                              Réponse de {question.answeredByName}
                            </span>
                            <span className="text-sm text-green-600 ml-2">
                              • {new Date(question.answeredAt!).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-green-700">{question.answer}</p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <p className="text-yellow-800 text-sm">
                            ⏳ En attente de réponse du professeur
                          </p>
                        </div>
                      )}

                      {/* Interactions */}
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleInteraction(question.id, 'like')}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition duration-200 ${
                            hasUserInteracted(question.id, 'like')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>{getInteractionCount(question.id, 'like')}</span>
                        </button>
                        <button
                          onClick={() => handleInteraction(question.id, 'helpful')}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition duration-200 ${
                            hasUserInteracted(question.id, 'helpful')
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>{getInteractionCount(question.id, 'helpful')}</span>
                          <span className="text-xs">Utile</span>
                        </button>
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