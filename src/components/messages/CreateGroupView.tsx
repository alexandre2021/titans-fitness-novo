import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Users } from 'lucide-react';
import { useAlunosSeguidores, AlunoSeguidor } from '@/hooks/useAlunosSeguidores'; 
import { useConversas, ConversaUI } from '@/hooks/useConversas';

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
  const { alunos, loading: loadingAlunos } = useAlunosSeguidores();
  const { criarGrupo, loadingConversa } = useConversas();
  const [groupName, setGroupName] = useState('');
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);

  const handleSelectAluno = (id: string) => {
    setSelectedAlunos(prev => 
      prev.includes(id) ? prev.filter(alunoId => alunoId !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedAlunos.length === 0) {
      console.error("Nome do grupo e pelo menos um participante são necessários.");
      return;
    }

    // Chama a função `criarGrupo` simplificada, sem o arquivo de imagem.
    const novoGrupo = await criarGrupo(groupName, selectedAlunos);
    if (novoGrupo) {
      onGroupCreated(novoGrupo);
    }
  };

  const canCreate = groupName.trim() !== '' && selectedAlunos.length > 0 && !loadingConversa;

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
          onClick={() => handleCreateGroup()}
          disabled={!canCreate}
        >
          {loadingConversa ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            `Criar Grupo (${selectedAlunos.length})`
          )}
        </Button>
      </div>
    </div>
  );
};