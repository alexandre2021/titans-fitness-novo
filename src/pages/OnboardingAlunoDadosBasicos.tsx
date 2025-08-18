import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { formatarTelefone } from "@/utils/formatters";
import { toast } from "sonner";

const OnboardingAlunoDadosBasicos = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useAlunoProfile();
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    genero: '',
    data_nascimento: '',
    telefone: '',
    peso: '',
    altura: '',
    descricao_pessoal: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar formData quando o profile carregar
  useEffect(() => {
    if (profile) {
      setFormData({
        nome_completo: profile.nome_completo || '',
        genero: profile.genero || '',
        data_nascimento: profile.data_nascimento || '',
        telefone: profile.telefone || '',
        peso: profile.peso?.toString() || '',
        altura: profile.altura?.toString() || '',
        descricao_pessoal: profile.descricao_pessoal || ''
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'telefone') {
      setFormData(prev => ({ ...prev, [field]: formatarTelefone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleNext = async () => {
    // Validar apenas o nome completo (obrigatório)
    if (!formData.nome_completo.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    setIsLoading(true);

    try {
      // Salvar dados da primeira etapa
      const success = await updateProfile({
        nome_completo: formData.nome_completo.trim(),
        genero: formData.genero || null,
        data_nascimento: formData.data_nascimento || null,
        telefone: formData.telefone || null,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        descricao_pessoal: formData.descricao_pessoal.trim() || null
      });

      if (success) {
        navigate('/onboarding-aluno/descricao-saude');
      } else {
        toast.error("Erro ao salvar dados. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao salvar dados básicos:', error);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      {loading ? (
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando seus dados...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Bem-vindo(a)!</CardTitle>
              <p className="text-muted-foreground">
                Vamos começar coletando suas informações básicas
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Etapa 1 de 2</span>
                <span>50%</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="nome_completo">Nome Completo *</Label>
                <Input
                  id="nome_completo"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={formData.nome_completo}
                  onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="genero">Gênero</Label>
                <Select value={formData.genero} onValueChange={(value) => handleInputChange('genero', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu gênero (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX (opcional)"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  maxLength={15}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  placeholder="Ex: 70 (opcional)"
                  value={formData.peso}
                  onChange={(e) => handleInputChange('peso', e.target.value)}
                  step="0.1"
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input
                  id="altura"
                  type="number"
                  placeholder="Ex: 175 (opcional)"
                  value={formData.altura}
                  onChange={(e) => handleInputChange('altura', e.target.value)}
                  step="0.1"
                  min="0"
                />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descricao_pessoal">Descrição Pessoal</Label>
                <Textarea
                  id="descricao_pessoal"
                  placeholder="Conte um pouco sobre seus objetivos, experiência com exercícios, preferências de treino, etc. (opcional)"
                  value={formData.descricao_pessoal}
                  onChange={(e) => handleInputChange('descricao_pessoal', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={handleNext}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? "Salvando..." : "Próximo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnboardingAlunoDadosBasicos;