import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ConversaUI, useConversas } from '@/hooks/useConversas';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, UserPlus, LogOut, Trash2, UserX, Check, X as XIcon, Loader2, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useGroupParticipants } from '@/hooks/useGroupParticipants';
import { useAlunosSeguidores } from '@/hooks/useAlunosSeguidores';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import Modal from 'react-modal';
import Cropper, { type Area } from 'react-easy-crop';
import { Slider } from '@/components/ui/slider';
import { fileToDataURL, optimizeAndCropImage } from '@/lib/imageUtils';

interface ImageCropDialogProps {
  imageSrc: string | null;
  isUploading: boolean;
  onClose: () => void;
  onSave: (croppedAreaPixels: Area) => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({ imageSrc, isUploading, onClose, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!imageSrc) return null;

  return (
    <Modal isOpen={!!imageSrc} onRequestClose={onClose} shouldCloseOnOverlayClick={!isUploading} className="bg-white rounded-lg max-w-md w-full mx-4 outline-none flex flex-col max-h-[90vh]" overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-[250] p-4">
      <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">Ajustar Imagem</h2><Button variant="ghost" size="icon" onClick={onClose} disabled={isUploading}><XIcon className="h-4 w-4" /></Button></div>
      <div className="p-4 overflow-y-auto">
        <div className="relative h-64 md:h-80 w-full bg-muted rounded-lg overflow-hidden">
          <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} cropShape="round" showGrid={false} />
        </div>
        <div className="space-y-2 pt-4"><label className="text-sm font-medium">Zoom</label><Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} /></div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t"><Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>Cancelar</Button><Button type="button" onClick={() => croppedAreaPixels && onSave(croppedAreaPixels)} disabled={isUploading || !croppedAreaPixels}>{isUploading ? "Salvando..." : "Salvar"}</Button></div>
    </Modal>
  );
};

interface GroupInfoViewProps {
  conversa: ConversaUI;
  onBack: () => void;
}

export const GroupInfoView = ({ conversa, onBack }: GroupInfoViewProps) => {
  const { user } = useAuth();
  const { participants, loading, refetch } = useGroupParticipants(conversa.id);
  const { removerParticipante, adicionarParticipantes, editarGrupo } = useConversas();
  const { alunos: alunosSeguidores } = useAlunosSeguidores();
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(conversa.nome);
  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);
  const [selectedAlunosToAdd, setSelectedAlunosToAdd] = useState<string[]>([]);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(conversa.avatar.url);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast.success('Nome do grupo atualizado!');
        setIsEditingName(false);
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
        toast.success('Participantes adicionados com sucesso!');
        setIsAddingParticipants(false);
        setSelectedAlunosToAdd([]);
        refetch();
      } else {
        toast.error('Erro ao adicionar participantes.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataURL(file);
      setImageSrc(dataUrl);
    } catch (error) {
      toast.error('Erro ao processar imagem.');
    }
    e.target.value = '';
  };

  const handleUploadCroppedImage = async (pixels: Area) => {
    if (!imageSrc) return;
    setIsUploading(true);
    try {
      const file = await optimizeAndCropImage(imageSrc, pixels, 256);
      if (!file) throw new Error('Falha ao cortar e otimizar a imagem');
      
      const fileName = `${conversa.id}/${Date.now()}_${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('group-avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('group-avatars').getPublicUrl(fileName);
      const finalUrl = `${publicUrl}?t=${new Date().getTime()}`;

      const success = await editarGrupo(conversa.id, { avatarUrl: finalUrl });
      if (success) {
        setAvatarPreview(finalUrl);
        toast.success('Avatar do grupo atualizado!');
      } else {
        throw new Error('Falha ao salvar avatar.');
      }
    } catch (error) {
      console.error('Erro ao atualizar avatar:', error);
      toast.error('Erro ao atualizar o avatar do grupo.');
    } finally {
      setIsUploading(false);
      setImageSrc(null);
    }
  };

  const handleLeaveGroup = () => {
    // TODO: Implementar lógica para sair do grupo
    console.log('Saindo do grupo');
  };

  const handleDeleteGroup = () => {
    // TODO: Implementar lógica para excluir o grupo
    console.log('Excluindo o grupo');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Avatar and Name Section */}
      <div className="flex flex-col items-center p-6 space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24 text-3xl">
            <AvatarImage src={avatarPreview || undefined} alt={conversa.nome} />
            <AvatarFallback style={{ backgroundColor: conversa.avatar.color || '#ccc', color: 'white' }}>
              {conversa.avatar.letter}
            </AvatarFallback>
          </Avatar>
          {isCreator && (
            <>
              <Button size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()}>
                <Edit className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden" />
            </>
          )}
        </div>
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
          <Button variant="destructive" className="w-full justify-start gap-3" onClick={handleDeleteGroup}>
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

      <ImageCropDialog
        imageSrc={imageSrc}
        isUploading={isUploading}
        onClose={() => setImageSrc(null)}
        onSave={async (pixels) => {
          await handleUploadCroppedImage(pixels);
        }}
      />
    </div>
  );
};