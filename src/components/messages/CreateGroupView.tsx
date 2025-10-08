import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAlunosSeguidores, AlunoSeguidor } from '@/hooks/useAlunosSeguidores'; 
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConversaUI {
  id: string;
  nome: string;
  outroParticipanteId: string | null;
  ultimaMsg: string;
  naoLidas: number;
  isGroup: boolean;
  updated_at: string;
  creatorId: string | null;
  avatar: {
    type: 'image' | 'letter' | 'group' | null;
    url: string | null;
    letter: string | null;
    color: string | null;
  };
}

interface CreateGroupViewProps {
  onCancel: () => void;
  onGroupCreated: (conversa: ConversaUI) => void;
}

const AlunoSelectItem = ({ aluno, onSelect, isSelected }: { aluno: AlunoSeguidor, onSelect: (id: string) => void, isSelected: boolean }) => (
  <div 
    onClick={() => onSelect(aluno.id)} 
    className="flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
  >
    <Checkbox
      id={`aluno-${aluno.id}`}
      checked={isSelected}
      className="mr-4"
    />
    {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
        <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc', color: 'white' }}>
          {aluno.nome_completo.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    ) : (
      <div 
        className="h-10 w-10 mr-3 rounded-full flex items-center justify-center font-semibold"
        style={{ backgroundColor: aluno.avatar_color || '#ccc', color: 'white' }}
      >
        {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
      </div>
    )}
    <p className="font-medium">{aluno.nome_completo}</p>
  </div>
);

export const CreateGroupView = ({ onCancel, onGroupCreated }: CreateGroupViewProps) => {
  const { user } = useAuth();
  const { alunos, loading: loadingAlunos } = useAlunosSeguidores();
  const [groupName, setGroupName] = useState('');
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSelectAluno = (id: string) => {
    setSelectedAlunos(prev => 
      prev.includes(id) ? prev.filter(alunoId => alunoId !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedAlunos.length === 0) {
      toast.error('Nome do grupo e pelo menos um participante são necessários');
      return;
    }

    setLoading(true);
    try {
      const todosParticipantes = [...new Set([user.id, ...selectedAlunos])];

      const { data, error } = await supabase.functions.invoke('create_group_conversation', {
        body: {
          nome_grupo: groupName,
          participantes_ids: todosParticipantes,
        },
      });

      if (error) throw error;

      const novoGrupo: ConversaUI = {
        id: data.conversa_id,
        nome: groupName,
        outroParticipanteId: null,
        creatorId: user.id,
        avatar: {
          type: 'group',
          url: null,
          letter: groupName.charAt(0).toUpperCase(),
          color: null,
        },
        ultimaMsg: 'Grupo criado. Dê as boas-vindas!',
        naoLidas: 0,
        isGroup: true,
        updated_at: new Date().toISOString(),
      };

      toast.success('Grupo criado com sucesso');
      onGroupCreated(novoGrupo);
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      toast.error('Erro ao criar grupo');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = groupName.trim() !== '' && selectedAlunos.length > 0 && !loading;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Novo Grupo</h3>
          <Input
            placeholder="Digite o nome do grupo..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="text-base border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 py-1 text-sm font-semibold text-muted-foreground">Selecione os participantes</p>
        {loadingAlunos ? (
          <div className="flex justify-center items-center h-full p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          alunos.map(aluno => (
            <AlunoSelectItem
              key={aluno.id}
              aluno={aluno}
              isSelected={selectedAlunos.includes(aluno.id)}
              onSelect={handleSelectAluno}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t mt-auto">
        <Button 
          className="w-full" 
          onClick={handleCreateGroup}
          disabled={!canCreate}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `Criar Grupo (${selectedAlunos.length})`
          )}
        </Button>
      </div>
    </div>
  );
};