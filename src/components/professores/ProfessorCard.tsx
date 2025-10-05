import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, User, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image';
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color?: string;
}

interface ProfessorCardProps {
  professor: Professor;
}

export const ProfessorCard = ({ professor }: ProfessorCardProps) => {
  const navigate = useNavigate();

  const getAvatarUrl = () => {
    if (professor.avatar_type === 'image' && professor.avatar_image_url) {
      return professor.avatar_image_url.startsWith('http')
        ? professor.avatar_image_url
        : supabase.storage.from('avatars').getPublicUrl(professor.avatar_image_url).data.publicUrl;
    }
    return undefined;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={getAvatarUrl()} alt={professor.nome_completo} />
              <AvatarFallback style={{ backgroundColor: professor.avatar_color }} className="text-white font-semibold">
                {professor.avatar_letter || professor.nome_completo.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{professor.nome_completo}</h3>
              <p className="text-sm text-muted-foreground truncate">{professor.email}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="default" 
                size="icon" 
                className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4"
              ><MoreVertical /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/professores/detalhes/${professor.id}`)}><User className="mr-2 h-4 w-4" />Ver Detalhes</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};