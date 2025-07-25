import { Link } from "react-router-dom";
import titansLogo from "@/assets/titans-logo.png";

const LandingFooter = () => {
  return (
    <footer className="bg-text-primary text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img src={titansLogo} alt="Titans.fitness" className="h-8 w-8" />
              <span className="text-xl font-bold">Titans.fitness</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              A plataforma completa para Personal Trainers que querem 
              profissionalizar seu trabalho e potencializar os resultados dos seus alunos.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                Instagram
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">
                YouTube
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Produto</h3>
            <ul className="space-y-2">
              <li><a href="#funcionalidades" className="text-gray-300 hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#planos" className="text-gray-300 hover:text-white transition-colors">Planos</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">API</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Integrações</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contato</a></li>
              <li><Link to="/termos" className="text-gray-300 hover:text-white transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-gray-300 hover:text-white transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm">
            © 2025 Titans.fitness. Todos os direitos reservados.
          </p>
          <p className="text-gray-300 text-sm mt-4 md:mt-0">
            Feito com ❤️ para Personal Trainers
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;