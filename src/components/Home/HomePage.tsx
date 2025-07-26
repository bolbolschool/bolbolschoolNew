import React from 'react';
import { BookOpen, Users, GraduationCap, ArrowRight } from 'lucide-react';

interface HomePageProps {
  onNavigateToLogin: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">BOLBOL SCHOOL</h1>
                <p className="text-sm text-gray-600">École d'Économie Tunisienne</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Bienvenue à <span className="text-blue-600">BOLBOL SCHOOL</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plateforme éducative moderne pour l'apprentissage de l'économie. 
            Rejoignez nos séances d'étude interactives et excellez dans vos études de baccalauréat.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition duration-300">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Cours Interactifs</h3>
            <p className="text-gray-600">
              Accédez à des cours d'économie complets et interactifs adaptés au programme tunisien.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition duration-300">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Séances d'Étude</h3>
            <p className="text-gray-600">
              Participez à des séances d'étude en groupe avec un suivi personnalisé de votre présence.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition duration-300">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Questions & Réponses</h3>
            <p className="text-gray-600">
              Posez vos questions et obtenez des réponses de vos professeurs et camarades de classe.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Prêt à commencer votre parcours ?</h2>
          <p className="text-xl mb-8 opacity-90">
            Rejoignez des milliers d'étudiants qui excellent grâce à notre plateforme.
          </p>
          <button
            onClick={onNavigateToLogin}
            className="bg-white text-blue-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition duration-300 flex items-center mx-auto text-lg"
          >
            <Users className="h-6 w-6 mr-3" />
            Espace Élève
            <ArrowRight className="h-6 w-6 ml-3" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
            <div className="text-gray-600">Étudiants Actifs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">24</div>
            <div className="text-gray-600">Séances par Semaine</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
            <div className="text-gray-600">Taux de Réussite</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
            <div className="text-gray-600">Support Disponible</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-blue-400 mr-3" />
            <span className="text-xl font-bold">BOLBOL SCHOOL</span>
          </div>
          <p className="text-gray-400">
            © 2025 BOLBOL SCHOOL. Tous droits réservés. Plateforme éducative tunisienne.
          </p>
        </div>
      </footer>
    </div>
  );
};