import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Aluno {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image';
  avatar_image_url?: string | null;
  avatar_letter?: string | null;
  avatar_color?: string | null;
}

interface AlunoCardBuscaProps {
  aluno: Aluno;
  onAdd: (alunoId: string) => void;
}

export const AlunoCardBusca = ({ aluno, onAdd }: AlunoCardBuscaProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Avatar>
          {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
            <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo || ''} />
          ) : (
            <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#3B82F6' }} className="text-white">
              {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <p className="font-semibold">{aluno.nome_completo}</p>
          <p className="text-sm text-muted-foreground">{aluno.email}</p>
        </div>
      </div>
      {/* Botão redondo no mobile, com texto no desktop */}
      <div className="flex items-center">
        <Button size="icon" onClick={() => onAdd(aluno.id)} className="sm:hidden rounded-full h-9 w-9" aria-label="Adicionar aluno"><Plus className="h-4 w-4" /></Button>
        <Button size="sm" onClick={() => onAdd(aluno.id)} className="hidden sm:flex"><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
      </div>
    </div>
  );
};