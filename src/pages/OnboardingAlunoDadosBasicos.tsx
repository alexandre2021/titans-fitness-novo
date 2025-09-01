// src/pages/OnboardingAlunoDadosBasicos.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { formatarTelefone } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QuestionarioSaudeModal from "@/components/QuestionarioSaudeModal";

const OnboardingAlunoDadosBasicos = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useAlunoProfile();
  
  const [formData, setFormData] = useState({
    email: '',
    nome_completo: '',
    genero: '',
    data_nascimento: '',
    telefone: '',
    peso: '',
    altura: '',
    descricao_pessoal: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionarioModal, setShowQuestionarioModal] = useState(false);

  const hoje = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

  // Carregar email do usuário autenticado e dados do profile
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Buscar email do usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email) {
          setFormData(prev => ({ ...prev, email: user.email }));
        }

        // Carregar dados do profile se existirem
        if (profile) {
          setFormData(prev => ({
            ...prev,
            nome_completo: profile.nome_completo || '',
            genero: profile.genero || '',
            data_nascimento: profile.data_nascimento || '',
            telefone: profile.telefone || '',
            peso: profile.peso?.toString() || '',
            altura: profile.altura?.toString() || '',
            descricao_pessoal: profile.descricao_pessoal || ''
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'telefone') {
      setFormData(prev => ({ ...prev, [field]: formatarTelefone(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const generateAvatar = () => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const letter = formData.nome_completo?.charAt(0).toUpperCase() || 'A';
    
    return {
      avatar_type: 'letter',
      avatar_letter: letter,
      avatar_color: randomColor
    };
  };

  const handleFinish = async () => {
    // Validar apenas o nome completo (obrigatório)
    if (!formData.nome_completo.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    setIsLoading(true);

    try {
      const avatarData = generateAvatar();

      // Salvar dados básicos (SEM marcar onboarding como completo ainda)
      const success = await updateProfile({
        nome_completo: formData.nome_completo.trim(),
        genero: formData.genero || null,
        data_nascimento: formData.data_nascimento || null,
        telefone: formData.telefone || null,
        peso: formData.peso ? parseFloat(formData.peso) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        descricao_pessoal: formData.descricao_pessoal.trim() || null,
        ...avatarData
      });

      if (success) {
        setShowQuestionarioModal(true);
      } else {
        toast.error("Erro ao salvar dados. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionarioResponse = async (responder: boolean) => {
    if (responder) {
      setShowQuestionarioModal(false);
      navigate('/onboarding-aluno/descricao-saude');
    } else {
      setIsLoading(true);
      try {
        const success = await updateProfile({
          onboarding_completo: true,
          par_q_respostas: null
        });

        if (success) {
          setShowQuestionarioModal(false);
          navigate('/index-aluno');
          toast.success("Bem-vindo(a) à plataforma!");
        } else {
          toast.error("Erro ao finalizar. Tente novamente.");
        }
      } catch (error) {
        console.error('Erro ao finalizar onboarding:', error);
        toast.error("Erro inesperado. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
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
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Bem-vindo(a)!</CardTitle>
            <p className="text-muted-foreground">
              Vamos configurar seu perfil para uma experiência personalizada
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Completo - Obrigatório */}
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

              {/* Email e Telefone - mesma linha no desktop */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  readOnly
                  className="bg-gray-100 border-gray-200 text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  maxLength={15}
                />
              </div>
              
              {/* Gênero */}
              <div className="space-y-2">
                <Label htmlFor="genero">Gênero</Label>
                <Select value={formData.genero} onValueChange={(value) => handleInputChange('genero', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  max={hoje}
                  onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                />
              </div>
              
              {/* Peso */}
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  placeholder="Ex: 70"
                  value={formData.peso}
                  onChange={(e) => handleInputChange('peso', e.target.value)}
                  step="0.1"
                  min="0"
                />
              </div>
              
              {/* Altura */}
              <div className="space-y-2">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input
                  id="altura"
                  type="number"
                  placeholder="Ex: 175"
                  value={formData.altura}
                  onChange={(e) => handleInputChange('altura', e.target.value)}
                  step="0.1"
                  min="0"
                />
              </div>
              
              {/* Descrição Pessoal */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descricao_pessoal">Descrição Pessoal</Label>
                <Textarea
                  id="descricao_pessoal"
                  placeholder="Conte um pouco sobre seus objetivos, experiência com exercícios, preferências de treino, etc."
                  value={formData.descricao_pessoal}
                  onChange={(e) => handleInputChange('descricao_pessoal', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={handleFinish}
                disabled={isLoading}
                className="w-full md:w-auto md:px-12"
                size="lg"
              >
                {isLoading ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <QuestionarioSaudeModal
        open={showQuestionarioModal}
        onOpenChange={setShowQuestionarioModal}
        onResponse={handleQuestionarioResponse}
        isLoading={isLoading}
      />
    </div>
  );
};

export default OnboardingAlunoDadosBasicos;