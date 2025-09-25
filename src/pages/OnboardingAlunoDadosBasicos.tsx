// src/pages/OnboardingAlunoDadosBasicos.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { useAlunoProfile } from "@/hooks/useAlunoProfile"; // ✅ Hook de perfil do aluno
import { toast } from "sonner"; 
import OnboardingContinuarModal from "@/components/OnboardingContinuarModal";
import CustomSelect from "@/components/ui/CustomSelect";

const GENERO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'prefiro_nao_dizer', label: 'Prefiro não dizer' },
];

const OnboardingAlunoDadosBasicos = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useAlunoProfile();
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    genero: '',
    data_nascimento: '',
    descricao_pessoal: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionarioModal, setShowQuestionarioModal] = useState(false);

  // Carregar dados do profile
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        nome_completo: profile.nome_completo || '',
        genero: profile.genero || '',
        data_nascimento: profile.data_nascimento || '',
        descricao_pessoal: profile.descricao_pessoal || ''
      }));
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    if (!formData.genero) {
      toast.error("Gênero é obrigatório");
      return;
    }

    if (!formData.data_nascimento) {
      toast.error("Data de nascimento é obrigatória");
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

              {/* Gênero */}
              <div className="space-y-2">
                <Label htmlFor="genero">Gênero *</Label>
                <CustomSelect
                  inputId="genero"
                  value={GENERO_OPTIONS.find(opt => opt.value === formData.genero)}
                  onChange={(option) => handleInputChange('genero', option ? String(option.value) : '')}
                  options={GENERO_OPTIONS}
                  placeholder="Selecione seu gênero"
                />
              </div>
              
              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                <DatePicker
                  value={formData.data_nascimento}
                  onChange={(date) =>
                    handleInputChange("data_nascimento", date || "")
                  }
                />
              </div>
              
              {/* Descrição Pessoal */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descricao_pessoal">Descrição Pessoal (Opcional)</Label>
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

      <OnboardingContinuarModal
        open={showQuestionarioModal}
        onOpenChange={setShowQuestionarioModal}
        onResponse={handleQuestionarioResponse}
        isLoading={isLoading}
        title="Questionário de Saúde (PAR-Q)"
        description="Para garantir sua segurança, recomendamos fortemente que você responda a um breve questionário de saúde. Deseja fazer isso agora?"
        confirmText="Sim, responder agora"
        cancelText="Não, pular por enquanto"
      />
    </div>
  );
};

export default OnboardingAlunoDadosBasicos;