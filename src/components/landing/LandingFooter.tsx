import { Link } from "react-router-dom";

const LandingFooter = () => {
  return (
    <footer className="bg-gray-100 text-gray-800 py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <img 
                src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png" 
                alt="Titans.fitness" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              A plataforma completa para Professores que querem 
              profissionalizar seu trabalho e potencializar os resultados dos seus alunos.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/titansfitnessapp/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 transition-colors">
                Instagram
              </a>
              <a href="https://www.linkedin.com/in/alexandre-ramos-266709398/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 transition-colors">
                LinkedIn
              </a>
              <a href="https://www.youtube.com/@TitansFitnessApp" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 transition-colors">
                YouTube
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-gray-800">Aplicativo</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/blog" onClick={() => window.scrollTo(0, 0)} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/sobre" onClick={() => window.scrollTo(0, 0)} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/faq" onClick={() => window.scrollTo(0, 0)} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Perguntas frequentes
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4 text-gray-800">Suporte</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contato" onClick={() => window.scrollTo(0, 0)} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/termos" onClick={() => window.scrollTo(0, 0)} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" onClick={() => window.scrollTo(0, 0)} className="text-gray-600 hover:text-gray-800 transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-300 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2025 Titans.fitness. Todos os direitos reservados.
          </p>
          <p className="text-gray-600 text-sm mt-4 md:mt-0">
            Feito com 💪🏾 para os Titans
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;