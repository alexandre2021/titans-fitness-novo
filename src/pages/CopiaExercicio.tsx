// pages/CopiaExercicio.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Exercicio = Tables<"exercicios">;

const CopiaExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercicioOriginal, setExercicioOriginal] = useState<Exercicio | null>(null);
  
  // Mock temporário para user
  const user = { id: 'temp-user-id' };
  
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    grupo_muscular: "",
    equipamento: "",
    dificuldade: "Baixa" as "Baixa" | "Média" | "Alta",
    instrucoes: "",
  });

  const [midias, setMidias] = useState({
    imagem_1_url: "",
    imagem_2_url: "",
    video_url: "",
    youtube_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const gruposMusculares = [
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 
    'Quadríceps', 'Glúteos', 'Isquiotibiais', 'Panturrilhas', 'Abdômen'
  ];

  const equipamentos = [
    'Peso Corporal', 'Halteres', 'Barra', 'Máquinas', 
    'Elásticos', 'Kettlebell', 'Cabo', 'Medicine Ball'
  ];

  const dificuldades = ['Baixa', 'Média', 'Alta'];

  // Carregar exercício original
  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id) {
        navigate('/exercicios-pt');
        return;
      }

      try {
        const { data: exercicio, error } = await supabase
          .from('exercicios')
          .select('*')
          .eq('id', id)
          .eq('is_ativo', true)
          .single();

        if (error) throw error;
        if (!exercicio) throw new Error('Exercício não encontrado');

        setExercicioOriginal(exercicio);

        // Preencher formulário com dados do exercício original
        setFormData({
          nome: `${exercicio.nome} (Personalizado)`,
          descricao: exercicio.descricao || "",
          grupo_muscular: exercicio.grupo_muscular || "",
          equipamento: exercicio.equipamento || "",
          dificuldade: (exercicio.dificuldade as "Baixa" | "Média" | "Alta") || "Baixa",
          instrucoes: exercicio.instrucoes || "",
        });

        // Preencher mídias (URLs do exercício original)
        setMidias({
          imagem_1_url: exercicio.imagem_1_url || "",
          imagem_2_url: exercicio.imagem_2_url || "",
          video_url: exercicio.video_url || "",
          youtube_url: exercicio.youtube_url || "",
        });

        console.log('✅ Exercício original carregado:', exercicio);
        
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o exercício. Verifique se o ID está correto.",
          variant: "destructive",
        });
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, navigate, toast]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.grupo_muscular) {
      newErrors.grupo_muscular = 'Grupo muscular é obrigatório';
    }

    if (!formData.equipamento) {
      newErrors.equipamento = 'Equipamento é obrigatório';
    }

    if (!formData.instrucoes.trim()) {
      newErrors.instrucoes = 'Instruções são obrigatórias';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) {
      toast({
        title: "Erro",
        description: "Por favor, corrija os erros no formulário.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Criar cópia personalizada no banco
      const { data: exercicio, error } = await supabase
        .from('exercicios')
        .insert({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          grupo_muscular: formData.grupo_muscular,
          equipamento: formData.equipamento,
          dificuldade: formData.dificuldade,
          instrucoes: formData.instrucoes.trim(),
          imagem_1_url: midias.imagem_1_url || null,
          imagem_2_url: midias.imagem_2_url || null,
          video_url: midias.video_url || null,
          youtube_url: midias.youtube_url || null,
          tipo: 'personalizado',
          pt_id: user.id,
          exercicio_padrao_id: exercicioOriginal?.id, // Referência ao exercício original
          is_ativo: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cópia do exercício criada com sucesso!",
      });

      console.log('✅ Cópia do exercício criada:', exercicio);
      navigate('/exercicios-pt');
      
    } catch (error) {
      console.error('❌ Erro ao criar cópia:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a cópia do exercício. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/exercicios-pt')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Criar Cópia Personalizada</h1>
            <p className="text-muted-foreground">Carregando exercício...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exercicioOriginal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/exercicios-pt')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Erro</h1>
            <p className="text-muted-foreground">Exercício não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/exercicios-pt')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Copy className="h-8 w-8" />
            Criar Cópia Personalizada
          </h1>
          <p className="text-muted-foreground">
            Baseado em: <span className="font-medium">{exercicioOriginal.nome}</span>
          </p>
        </div>
      </div>

      {/* Exercício original */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Copy className="h-5 w-5" />
            Exercício Original
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-blue-700">Nome</Label>
              <p className="text-sm">{exercicioOriginal.nome}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-blue-700">Grupo Muscular</Label>
              <p className="text-sm">{exercicioOriginal.grupo_muscular}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-blue-700">Equipamento</Label>
              <p className="text-sm">{exercicioOriginal.equipamento}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              {exercicioOriginal.tipo === 'padrao' ? 'Exercício Padrão' : 'Exercício Personalizado'}
            </Badge>
            {exercicioOriginal.dificuldade && (
              <Badge variant="secondary">
                {exercicioOriginal.dificuldade}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário principal */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Cópia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Exercício *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Supino com halteres (Personalizado)"
                  className={errors.nome ? "border-red-500" : ""}
                />
                {errors.nome && (
                  <p className="text-sm text-red-500 mt-1">{errors.nome}</p>
                )}
              </div>

              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o exercício brevemente..."
                  className={errors.descricao ? "border-red-500" : ""}
                />
                {errors.descricao && (
                  <p className="text-sm text-red-500 mt-1">{errors.descricao}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="grupo_muscular">Grupo Muscular *</Label>
                  <Select
                    value={formData.grupo_muscular}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, grupo_muscular: value }))}
                  >
                    <SelectTrigger className={errors.grupo_muscular ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {gruposMusculares.map((grupo) => (
                        <SelectItem key={grupo} value={grupo}>
                          {grupo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.grupo_muscular && (
                    <p className="text-sm text-red-500 mt-1">{errors.grupo_muscular}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="equipamento">Equipamento *</Label>
                  <Select
                    value={formData.equipamento}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, equipamento: value }))}
                  >
                    <SelectTrigger className={errors.equipamento ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipamentos.map((equipamento) => (
                        <SelectItem key={equipamento} value={equipamento}>
                          {equipamento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.equipamento && (
                    <p className="text-sm text-red-500 mt-1">{errors.equipamento}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="dificuldade">Dificuldade</Label>
                <Select
                  value={formData.dificuldade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dificuldade: value as "Baixa" | "Média" | "Alta" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dificuldades.map((dificuldade) => (
                      <SelectItem key={dificuldade} value={dificuldade}>
                        {dificuldade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="instrucoes">Instruções de Execução *</Label>
                <Textarea
                  id="instrucoes"
                  value={formData.instrucoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, instrucoes: e.target.value }))}
                  placeholder="Descreva como executar o exercício passo a passo..."
                  rows={4}
                  className={errors.instrucoes ? "border-red-500" : ""}
                />
                {errors.instrucoes && (
                  <p className="text-sm text-red-500 mt-1">{errors.instrucoes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload de mídias - Placeholder temporário */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Mídias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Componente MediaUploadSection será implementado aqui
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>URL Imagem 1</Label>
                  <Input
                    value={midias.imagem_1_url}
                    onChange={(e) => setMidias(prev => ({ ...prev, imagem_1_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>URL Imagem 2</Label>
                  <Input
                    value={midias.imagem_2_url}
                    onChange={(e) => setMidias(prev => ({ ...prev, imagem_2_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>URL Vídeo</Label>
                  <Input
                    value={midias.video_url}
                    onChange={(e) => setMidias(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>URL YouTube</Label>
                  <Input
                    value={midias.youtube_url}
                    onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/exercicios-pt')}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Cópia"}
        </Button>
      </div>
    </div>
  );
};

export default CopiaExercicio;