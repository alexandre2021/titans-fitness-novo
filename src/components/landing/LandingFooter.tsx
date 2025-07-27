import { Link } from "react-router-dom";

const LandingFooter = () => {
  return (
    <footer className="bg-gray-100 text-gray-800 py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets//TitansFitnessLogo.png" 
                alt="Titans.fitness" 
                className="h-14"
              />
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              A plataforma completa para Personal Trainers que querem 
              profissionalizar seu trabalho e potencializar os resultados dos seus alunos.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors">
                Instagram
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors">
                LinkedIn
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors">
                YouTube
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-gray-800">Produto</h3>
            <ul className="space-y-2">
              <li><a href="#funcionalidades" className="text-gray-600 hover:text-gray-800 transition-colors">Funcionalidades</a></li>
              <li><a href="#planos" className="text-gray-600 hover:text-gray-800 transition-colors">Planos</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-800 transition-colors">API</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-800 transition-colors">Integrações</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-gray-800">Suporte</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-800 transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-800 transition-colors">Contato</a></li>
              <li><Link to="/termos" className="text-gray-600 hover:text-gray-800 transition-colors">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="text-gray-600 hover:text-gray-800 transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-300 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2025 Titans.fitness. Todos os direitos reservados.
          </p>
          <p className="text-gray-600 text-sm mt-4 md:mt-0">
            Feito com ❤️ para Personal Trainers
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;