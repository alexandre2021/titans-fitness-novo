import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Trash2, 
  MoreVertical, 
  ChevronDown, 
  Eye, 
  FileText, 
  BarChart3, 
  ShieldQuestion 
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';

interface Aluno {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  genero?: string;
  onboarding_completo: boolean;
  status: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

interface AlunoCardProps {
  aluno: Aluno;
  onDesvincular: (id: string) => Promise<boolean>;
}

export const AlunoCard = ({ aluno, onDesvincular }: AlunoCardProps) => {
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleDesvincular = async () => {
    setIsUnlinking(true);
    const success = await onDesvincular(aluno.id);
    
    if (success) {
      setShowUnlinkDialog(false);
    } else {
      toast.error("Erro", {
        description: "Não foi possível desvincular o aluno. Tente novamente."
      })
    }
    setIsUnlinking(false);
  };

  const handleCancelar = () => {
    if (isUnlinking) return;
    setShowUnlinkDialog(false);
  };

  const renderAvatar = () => {
    if (aluno.avatar_type === 'image' && aluno.avatar_image_url) {
      return <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />;
    }
    
    return (
      <AvatarFallback 
        style={{ backgroundColor: aluno.avatar_color }}
        className="text-white font-semibold"
      >
        {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
      </AvatarFallback>
    );
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="h-12 w-12">
                {renderAvatar()}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {aluno.nome_completo}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {aluno.email}
                </p>
                <div className="mt-2">
                  <Badge 
                    variant={aluno.onboarding_completo ? "default" : "secondary"}
                    className={aluno.onboarding_completo ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                  >
                    {aluno.onboarding_completo ? "Ativo" : "Pendente"}
                  </Badge>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4"><MoreVertical /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate(`/detalhes-aluno/${aluno.id}`)} className="py-3">
                  <Eye className="mr-3 h-6 w-6" />
                  <span className="text-lg">Ver Detalhes</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/alunos-rotinas/${aluno.id}`)} className="py-3">
                  <FileText className="mr-3 h-6 w-6" />
                  <span className="text-lg">Rotinas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/alunos-avaliacoes/${aluno.id}`)} className="py-3">
                  <BarChart3 className="mr-3 h-6 w-6" />
                  <span className="text-lg">Avaliações</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/alunos-parq/${aluno.id}`)} className="py-3">
                  <ShieldQuestion className="mr-3 h-6 w-6" />
                  <span className="text-lg">PAR-Q</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowUnlinkDialog(true)} className="text-destructive focus:text-destructive py-3">
                  <Trash2 className="mr-3 h-6 w-6" />
                  <span className="text-lg">Desvincular</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Remoção de Vínculo - React Modal BLOQUEADA */}
      <Modal
        isOpen={showUnlinkDialog}
        onRequestClose={() => {}} // Não permite fechar
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Remover Vínculo</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Tem certeza que deseja remover o vínculo com o aluno{" "}
            <span className="font-semibold text-gray-900">
              "{aluno.nome_completo}"
            </span>?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Você perderá o acesso aos dados dele.
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleCancelar}
            disabled={isUnlinking}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDesvincular} 
            disabled={isUnlinking}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
          >
            {isUnlinking ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Remover
              </>
            )}
          </Button>
        </div>
      </Modal>
    </>
  );
};