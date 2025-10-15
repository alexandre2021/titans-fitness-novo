import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, User, Trash2, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Professor } from "@/hooks/useProfessores";
import { Badge } from "@/components/ui/badge";

interface ProfessorCardProps {
  professor: Professor;
  onDesvincular: (professorId: string) => void;
}

export const ProfessorCard = ({ professor, onDesvincular }: ProfessorCardProps) => {
  const navigate = useNavigate();

  const getAvatarContent = () => {
    if (professor.avatar_type === 'image' && professor.avatar_image_url) {
      return <AvatarImage src={professor.avatar_image_url} alt={professor.nome_completo} />;
    }
    const letter = professor.avatar_letter || professor.nome_completo?.charAt(0) || 'P';
    const color = professor.avatar_color || '#3B82F6';
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
        {letter}
      </AvatarFallback>
    );
  };

  const handleDesvincularClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDesvincular(professor.id);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/professores/detalhes/${professor.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12">
              {getAvatarContent()}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{professor.nome_completo}</h3>
              <p className="text-sm text-muted-foreground truncate">{professor.email}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" 
                onClick={(e) => e.stopPropagation()}
              ><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/professores/detalhes/${professor.id}`); }}>
                <User className="mr-2 h-4 w-4" />Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDesvincularClick}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Deixar de Seguir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {professor.temRotinaAtiva && (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1.5">
              <Dumbbell className="h-3 w-3" />
              Rotina Ativa
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};