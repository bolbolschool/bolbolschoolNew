import React, { useState, useEffect } from 'react';
import { ArrowLeft, HelpCircle, MessageCircle, Send, CheckCircle, ThumbsUp, User, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { supabase } from '../../lib/supabase';
import { Question, QuestionInteraction } from '../../types';

interface QuestionsManagementProps {
  onBack: () => void;
}

export const QuestionsManagement: React.FC<QuestionsManagementProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { sessions } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [interactions, setInteractions] = useState<Record<string, QuestionInteraction[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadQuestions();
  }, [selectedSession]);

  const loadQuestions = async () => {
    try {
      let query = supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedSession) {
        query = query.eq('session_id', selectedSession);
      }

      const { data: questionsData, error: questionsError } = await query;

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
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    const answerText = answerTexts[questionId];
    if (!user || !answerText?.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({
          answered_by: user.id,
          answered_by_name: `${user.firstName} ${user.lastName}`,
          answer: answerText.trim(),
          answered_at: new Date().toISOString(),
        })
        .eq('id', questionId);

      if (error) {
        console.error('Error answering question:', error);
        alert('Erreur lors de la réponse à la question');
        return;
      }

      setAnswerTexts(prev => ({ ...prev, [questionId]: '' }));
      await loadQuestions();
      alert('Réponse envoyée avec succès!');
    } catch (error) {
      console.error('Error answering question:', error);
      alert('Erreur lors de la réponse à la question');
    }
  };

  const getSessionName = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    return session ? `${session.day} - ${session.time}` : 'Session inconnue';
  };

  const getInteractionCount = (questionId: string, type: 'like' | 'helpful') => {
    return interactions[questionId]?.filter(i => i.type === type).length || 0;
  };

  const unansweredQuestions = questions.filter(q => !q.answer);
  const answeredQuestions = questions.filter(q => q.answer);

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
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Questions</h1>
          </div>
        </div>

        {/* Session Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Filtrer par séance:
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Toutes les séances</option>
              {sessions.filter(s => s.isActive).map((session) => (
                <option key={session.id} value={session.id}>
                  {session.day} - {session.time} ({session.enrollmentCount || 0} étudiants)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <HelpCircle className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">En Attente</p>
                <p className="text-2xl font-bold text-gray-900">{unansweredQuestions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Répondues</p>
                <p className="text-2xl font-bold text-gray-900">{answeredQuestions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unanswered Questions */}
        {unansweredQuestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-orange-600">
              Questions en attente de réponse ({unansweredQuestions.length})
            </h2>
            <div className="space-y-6">
              {unansweredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="border border-orange-200 rounded-lg p-6 bg-orange-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {question.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-3 space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>{question.askedByName}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          <span>{getSessionName(question.sessionId)}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {new Date(question.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4">{question.content}</p>
                    </div>
                  </div>

                  {/* Answer Form */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Votre réponse:
                    </label>
                    <textarea
                      value={answerTexts[question.id] || ''}
                      onChange={(e) => setAnswerTexts(prev => ({ ...prev, [question.id]: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                      placeholder="Rédigez votre réponse ici..."
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleAnswerQuestion(question.id)}
                        disabled={!answerTexts[question.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition duration-200 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer la réponse
                      </button>
                    </div>
                  </div>

                  {/* Interactions */}
                  <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{getInteractionCount(question.id, 'like')}</span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                      <CheckCircle className="h-4 w-4" />
                      <span>{getInteractionCount(question.id, 'helpful')}</span>
                      <span className="text-xs">Utile</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answered Questions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-green-600">
            Questions répondues ({answeredQuestions.length})
          </h2>
          
          {answeredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune question répondue</p>
            </div>
          ) : (
            <div className="space-y-6">
              {answeredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="border border-green-200 rounded-lg p-6 bg-green-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {question.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-3 space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>{question.askedByName}</span>
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          <span>{getSessionName(question.sessionId)}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>
                            {new Date(question.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-4">{question.content}</p>
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">
                        Votre réponse
                      </span>
                      <span className="text-sm text-green-600 ml-2">
                        • {new Date(question.answeredAt!).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-green-700">{question.answer}</p>
                  </div>

                  {/* Interactions */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{getInteractionCount(question.id, 'like')}</span>
                    </div>
                    <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                      <CheckCircle className="h-4 w-4" />
                      <span>{getInteractionCount(question.id, 'helpful')}</span>
                      <span className="text-xs">Utile</span>
                    </div>
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