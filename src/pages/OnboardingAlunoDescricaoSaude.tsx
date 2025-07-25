import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { toast } from "sonner";

const OnboardingAlunoDescricaoSaude = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAlunoProfile();
  
  const [formData, setFormData] = useState({
    descricao_pessoal: profile?.descricao_pessoal || '',
    par_q_respostas: profile?.par_q_respostas || {
      questao1: false,
      questao2: false,
      questao3: false,
      questao4: false,
      questao5: false,
      questao6: false,
      questao7: false
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const parQuestoes = [
    "Seu médico já disse que você possui algum problema cardíaco?",
    "Você sente dor no peito quando faz atividade física?",
    "No último mês, você sentiu dor no peito quando não estava fazendo atividade física?",
    "Você já perdeu o equilíbrio por tonturas ou perdeu a consciência?",
    "Você tem algum problema ósseo ou articular que poderia ser agravado pela atividade física?",
    "Seu médico já receitou medicamentos para pressão arterial ou problemas cardíacos?",
    "Você tem conhecimento de alguma razão pela qual não deveria fazer atividade física?"
  ];

  const handleParQChange = (questaoIndex: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      par_q_respostas: {
        ...prev.par_q_respostas,
        [`questao${questaoIndex + 1}`]: checked
      }
    }));
  };

  const generateAvatar = () => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const letter = profile?.nome_completo?.charAt(0).toUpperCase() || 'A';
    
    return {
      avatar_type: 'letter',
      avatar_letter: letter,
      avatar_color: randomColor
    };
  };

  const handleFinish = async () => {
    setIsLoading(true);

    try {
      const avatarData = generateAvatar();

      // Salvar dados finais e marcar onboarding como completo
      const success = await updateProfile({
        descricao_pessoal: formData.descricao_pessoal.trim() || null,
        par_q_respostas: formData.par_q_respostas,
        onboarding_completo: true,
        ...avatarData
      });

      if (success) {
        toast.success("Onboarding concluído com sucesso!");
        navigate('/index-aluno');
      } else {
        toast.error("Erro ao finalizar onboarding. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao finalizar onboarding:', error);
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    navigate('/onboarding-aluno/dados-basicos');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Descrição e Saúde</CardTitle>
            <p className="text-muted-foreground">
              Nos conte um pouco sobre você e responda ao questionário de saúde
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa 2 de 2</span>
              <span>100%</span>
            </div>
            <Progress value={100} className="w-full" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="descricao_pessoal">Descrição Pessoal (Opcional)</Label>
            <Textarea
              id="descricao_pessoal"
              placeholder="Conte um pouco sobre seus objetivos, experiência com exercícios, preferências de treino, etc."
              value={formData.descricao_pessoal}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao_pessoal: e.target.value }))}
              rows={4}
            />
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Questionário de Prontidão para Atividade Física (PAR-Q) *</Label>
              <p className="text-sm text-muted-foreground">
                Responda com sinceridade. Estas informações ajudarão seu personal trainer a criar um programa adequado para você.
              </p>
            </div>
            
            <div className="space-y-4">
              {parQuestoes.map((questao, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`questao-${index}`}
                    checked={formData.par_q_respostas[`questao${index + 1}`]}
                    onCheckedChange={(checked) => handleParQChange(index, checked as boolean)}
                  />
                  <label
                    htmlFor={`questao-${index}`}
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    {questao}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between gap-4">
            <Button 
              variant="outline"
              onClick={handlePrevious}
              className="w-full md:w-auto"
            >
              Anterior
            </Button>
            <Button 
              onClick={handleFinish}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? "Finalizando..." : "Finalizar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingAlunoDescricaoSaude;