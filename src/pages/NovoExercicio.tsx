// pages/NovoExercicio.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NovoExercicio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  
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

    setLoading(true);

    try {
      // Criar exercício no banco
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
          is_ativo: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Exercício criado com sucesso!",
      });

      console.log('✅ Exercício criado:', exercicio);
      navigate('/exercicios-pt');
      
    } catch (error) {
      console.error('❌ Erro ao criar exercício:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o exercício. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold">Novo Exercício</h1>
          <p className="text-muted-foreground">
            Crie um exercício personalizado do zero
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário principal */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Exercício *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Supino com halteres"
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
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Exercício"}
        </Button>
      </div>
    </div>
  );
};

export default NovoExercicio;