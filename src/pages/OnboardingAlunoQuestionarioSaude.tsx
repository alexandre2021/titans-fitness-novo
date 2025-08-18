import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { toast } from "sonner";

const OnboardingAlunoQuestionarioSaude = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useAlunoProfile();
  
  const [formData, setFormData] = useState({
    par_q_respostas: {
      questao1: null as boolean | null,
      questao2: null as boolean | null,
      questao3: null as boolean | null,
      questao4: null as boolean | null,
      questao5: null as boolean | null,
      questao6: null as boolean | null,
      questao7: null as boolean | null,
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar formData quando o profile carregar
  useEffect(() => {
    if (profile?.par_q_respostas) {
      const parQData = profile.par_q_respostas as Record<string, boolean>;
      setFormData({
        par_q_respostas: {
          questao1: parQData?.questao1 ?? null,
          questao2: parQData?.questao2 ?? null,
          questao3: parQData?.questao3 ?? null,
          questao4: parQData?.questao4 ?? null,
          questao5: parQData?.questao5 ?? null,
          questao6: parQData?.questao6 ?? null,
          questao7: parQData?.questao7 ?? null,
        }
      });
    }
  }, [profile]);

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
    // Validar se todas as questões foram respondidas
    const questoesRespondidas = Object.values(formData.par_q_respostas).length;
    if (questoesRespondidas < 7) {
      toast.error("Por favor, responda todas as questões do questionário de saúde.");
      return;
    }

    setIsLoading(true);

    try {
      const avatarData = generateAvatar();

      // Salvar dados finais e marcar onboarding como completo
      const success = await updateProfile({
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
      {loading ? (
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Questionário de Saúde</CardTitle>
              <p className="text-muted-foreground">
                Responda ao questionário PAR-Q para garantir sua segurança durante os exercícios
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Questionário de Prontidão para Atividade Física (PAR-Q) *</Label>
                <p className="text-sm text-muted-foreground">
                  <strong>Responda todas as questões com sinceridade.</strong> Estas informações são obrigatórias e ajudarão seu personal trainer a criar um programa seguro e adequado para você.
                </p>
              </div>
              
              <div className="space-y-4">
                {parQuestoes.map((questao, index) => {
                  const questaoKey = `questao${index + 1}` as keyof typeof formData.par_q_respostas;
                  const valorAtual = formData.par_q_respostas[questaoKey];
                  
                  return (
                    <div key={index} className="space-y-3 p-4 border rounded-lg bg-gray-50">
                      <p className="text-sm font-medium leading-relaxed text-gray-900">
                        {index + 1}. {questao} *
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`questao-${index}`}
                            value="true"
                            checked={valorAtual === true}
                            onChange={() => handleParQChange(index, true)}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`questao-${index}`}
                            value="false"
                            checked={valorAtual === false}
                            onChange={() => handleParQChange(index, false)}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">Não</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
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
      )}
    </div>
  );
};

export default OnboardingAlunoQuestionarioSaude;