import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ConversaUI, useConversas } from '@/hooks/useConversas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, UserPlus, LogOut, Trash2, UserX, Check, X as XIcon, Loader2, Crown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useGroupParticipants } from '@/hooks/useGroupParticipants';
import { useAlunosSeguidores } from '@/hooks/useAlunosSeguidores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface GroupInfoViewProps {
  conversa: ConversaUI;
  onBack: () => void;
  onGroupUpdated: () => void;
  onGroupDeleted?: () => void;
}

export const GroupInfoView = ({ conversa, onBack, onGroupUpdated, onGroupDeleted }: GroupInfoViewProps) => {
  const { user } = useAuth();
  const { participants, loading, refetch } = useGroupParticipants(conversa.id);
  const { removerParticipante, adicionarParticipantes, editarGrupo, excluirGrupo } = useConversas();
  const { alunos: alunosSeguidores } = useAlunosSeguidores();
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversa.nome);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);
  const [selectedAlunosToAdd, setSelectedAlunosToAdd] = useState<string[]>([]);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const alunosDisponiveis = alunosSeguidores.filter(
    aluno => !participants.some(p => p.id === aluno.id)
  );

  const handleToggleAluno = (alunoId: string) => {
    setSelectedAlunosToAdd(prev =>
      prev.includes(alunoId) ? prev.filter(id => id !== alunoId) : [...prev, alunoId]
    );
  };

  const isCreator = user?.id === conversa.creatorId;

  const handleNameSave = async () => {
    if (!groupName.trim() || groupName.trim() === conversa.nome) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      const success = await editarGrupo(conversa.id, { nome: groupName.trim() });
      if (success) {
        setIsEditingName(false);
        onGroupUpdated();
      } else {
        toast.error('Erro ao atualizar o nome do grupo.');
      }
    } finally {
      setIsSavingName(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    setRemovingParticipantId(participantId);
    const success = await removerParticipante(conversa.id, participantId);
    if (success) {
      // Recarrega a lista de participantes
      refetch();
    }
    // TODO: Adicionar toast de erro em caso de falha
    setRemovingParticipantId(null);
  };

  const handleAddParticipants = async () => {
    if (selectedAlunosToAdd.length === 0) return;
    setIsAdding(true);
    try {
      const success = await adicionarParticipantes(conversa.id, selectedAlunosToAdd);
      if (success) {
        setIsAddingParticipants(false);
        setSelectedAlunosToAdd([]);
        onGroupUpdated();
        refetch();
      } else {
        toast.error('Erro ao adicionar participantes.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleLeaveGroup = () => {
    // TODO: Implementar lógica para sair do grupo
    console.log('Saindo do grupo');
  };

  const handleDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      const success = await excluirGrupo(conversa.id);
      if (success) {
        toast.success('Grupo excluído');
        setIsDeleteDialogOpen(false);
        // Solução "de estagiário": recarrega a página para garantir que a lista seja atualizada.
        sessionStorage.setItem('openDrawerAfterReload', 'true');
        window.location.reload();
      } else {
        toast.error('Erro ao excluir o grupo. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      toast.error('Erro ao excluir o grupo. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Avatar and Name Section */}
      <div className="flex flex-col items-center p-6 space-y-4">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="text-xl h-10" disabled={isSavingName} />
            <Button size="icon" variant="ghost" onClick={handleNameSave} disabled={isSavingName}>
              {isSavingName ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5 text-green-600" />
              )}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)} disabled={isSavingName}>
              <XIcon className="h-5 w-5 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{groupName}</h2>
            {isCreator && (
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)}>
                <Edit className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Participants Section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">{participants.length} Participantes</h4>
          {isCreator && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setIsAddingParticipants(true)}
            >
              <UserPlus className="h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {loading ? <p>Carregando...</p> : participants.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatar_image_url || undefined} />
                  <AvatarFallback style={{ backgroundColor: p.avatar_color || '#ccc', color: 'white' }}>
                    {p.avatar_letter}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.nome_completo}</p>
                  {p.id === conversa.creatorId && (
                    <Badge variant="secondary" className="text-xs font-normal">Criador</Badge>
                  )}
                </div>
              </div>
              {isCreator && user?.id !== p.id && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                  onClick={() => handleRemoveParticipant(p.id)}
                  disabled={removingParticipantId === p.id}
                >
                  {removingParticipantId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Actions Zone */}
      <div className="p-4 space-y-2 mt-auto border-t">
        {!isCreator && (
          <Button variant="outline" className="w-full justify-start gap-3 text-destructive hover:text-destructive" onClick={handleLeaveGroup}>
            <LogOut className="h-5 w-5" />
            Sair do Grupo
          </Button>
        )}
        {isCreator && (
          <Button variant="destructive" className="w-full justify-start gap-3" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-5 w-5" />
            Excluir Grupo
          </Button>
        )}
      </div>

      {/* Dialog para adicionar participantes */}
      <Dialog open={isAddingParticipants} onOpenChange={setIsAddingParticipants}>
        <DialogContent className="z-[200]">
          <DialogHeader>
            <DialogTitle>Adicionar Participantes</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {alunosDisponiveis.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Todos os seus alunos já estão no grupo</p>
            ) : (
              alunosDisponiveis.map(aluno => (
                <div key={aluno.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isAdding ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/50'}`} onClick={() => !isAdding && handleToggleAluno(aluno.id)}>
                  <Checkbox checked={selectedAlunosToAdd.includes(aluno.id)} disabled={isAdding} />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={aluno.avatar_image_url || undefined} />
                    <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc', color: 'white' }}>
                      {aluno.avatar_letter}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium truncate">{aluno.nome_completo}</p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingParticipants(false)} disabled={isAdding}>Cancelar</Button>
            <Button onClick={handleAddParticipants} disabled={selectedAlunosToAdd.length === 0 || isAdding}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar ({selectedAlunosToAdd.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="z-[200]">
          <DialogHeader>
            <DialogTitle>Excluir Grupo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Tem certeza que deseja excluir o grupo <strong>{conversa.nome}</strong>?
            </p>
            <p className="text-muted-foreground mt-2">
              Esta ação não pode ser desfeita. Todas as mensagens do grupo serão permanentemente excluídas.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};