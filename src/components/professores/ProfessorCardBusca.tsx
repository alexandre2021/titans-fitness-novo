import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, Check, Loader2 } from 'lucide-react';

interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image';
  avatar_image_url?: string | null;
  avatar_letter?: string | null;
  avatar_color?: string | null;
}

interface ProfessorCardBuscaProps {
  professor: Professor;
  onAdd: (professorId: string) => Promise<void>;
}

export const ProfessorCardBusca = ({ professor, onAdd }: ProfessorCardBuscaProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddClick = async () => {
    setIsAdding(true);
    await onAdd(professor.id);
    setIsAdded(true);
    // Não resetamos isAdding para manter o estado do botão
  };

  const getAvatarContent = () => {
    if (professor.avatar_type === 'image' && professor.avatar_image_url) {
      return <AvatarImage src={professor.avatar_image_url} />;
    }
    const letter = professor.avatar_letter || professor.nome_completo?.charAt(0) || 'P';
    const color = professor.avatar_color || '#3B82F6';
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {getAvatarContent()}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{professor.nome_completo}</p>
          <p className="text-xs text-muted-foreground truncate">{professor.email}</p>
        </div>
      </div>
      <Button size="sm" onClick={handleAddClick} disabled={isAdding || isAdded}>
        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        <span className="ml-2 hidden sm:inline">{isAdded ? 'Seguindo' : 'Seguir'}</span>
      </Button>
    </div>
  );
};
