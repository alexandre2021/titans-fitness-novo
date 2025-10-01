import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Camera, X } from 'lucide-react';
import { useAlunosSeguidores, AlunoSeguidor } from '@/hooks/useAlunosSeguidores';
import { useConversas, ConversaUI } from '@/hooks/useConversas';
import { supabase } from '@/integrations/supabase/client';
import Modal from 'react-modal';
import Cropper, { type Area } from 'react-easy-crop';
import { Slider } from '@/components/ui/slider';
import { fileToDataURL, optimizeAndCropImage } from '@/lib/imageUtils';
import { toast } from 'sonner';

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
    <Modal isOpen={!!imageSrc} onRequestClose={onClose} shouldCloseOnOverlayClick={!isUploading} className="bg-white rounded-lg max-w-md w-full mx-4 outline-none flex flex-col max-h-[90vh]" overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-[150] p-4">
      <div className="flex items-center justify-between p-4 border-b"><h2 className="text-lg font-semibold">Ajustar Imagem</h2><Button variant="ghost" size="icon" onClick={onClose} disabled={isUploading}><X className="h-4 w-4" /></Button></div>
      <div className="p-4 overflow-y-auto"><Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} cropShape="round" showGrid={false} classes={{ containerClassName: 'bg-white h-64 md:h-80 w-full' }} style={{ containerStyle: { backgroundColor: 'white' }, mediaStyle: { backgroundColor: 'white' } }} />
        <div className="space-y-2 pt-4"><label className="text-sm font-medium">Zoom</label><Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} /></div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t"><Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>Cancelar</Button><Button type="button" onClick={() => croppedAreaPixels && onSave(croppedAreaPixels)} disabled={isUploading || !croppedAreaPixels}>{isUploading ? "Salvando..." : "Salvar"}</Button></div>
    </Modal>
  );
};

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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectAluno = (id: string) => {
    setSelectedAlunos(prev => 
      prev.includes(id) ? prev.filter(alunoId => alunoId !== id) : [...prev, id]
    );
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
    e.target.value = ''; // Permite selecionar o mesmo arquivo novamente
  };

  const handleCreateGroup = async (croppedImageFile: File | null = null) => {
    if (!groupName.trim() || selectedAlunos.length === 0) {
      // TODO: Adicionar feedback visual para o usuário (toast)
      console.error("Nome do grupo e pelo menos um participante são necessários.");
      return;
    }

    let avatarUrl: string | null = null;

    if (croppedImageFile) {
      const file = croppedImageFile;
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('group-avatars')
        .upload(fileName, file);

      if (error) {
        console.error('Erro ao fazer upload do avatar do grupo:', error);
        // TODO: Adicionar feedback de erro para o usuário
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('group-avatars').getPublicUrl(data.path);
      avatarUrl = `${publicUrl}?t=${new Date().getTime()}`;
    }

    const novoGrupo = await criarGrupo(groupName, selectedAlunos, avatarUrl);
    if (novoGrupo) {
      novoGrupo.avatar.url = avatarUrl;
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
        <div className="flex-1 flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <AvatarImage src={avatarPreview || undefined} alt={groupName} />
              <AvatarFallback className="bg-muted">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleFileSelect}
              className="hidden" 
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Novo Grupo</h3>
            <Input
              placeholder="Nome do grupo..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="text-base border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
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

      <ImageCropDialog
        imageSrc={imageSrc}
        isUploading={loadingConversa}
        onClose={() => setImageSrc(null)}
        onSave={async (pixels) => {
          const file = await optimizeAndCropImage(imageSrc!, pixels, 256);
          setAvatarPreview(URL.createObjectURL(file!));
          setImageSrc(null); // Fecha o modal
          await handleCreateGroup(file);
        }}
      />
    </div>
  );
};