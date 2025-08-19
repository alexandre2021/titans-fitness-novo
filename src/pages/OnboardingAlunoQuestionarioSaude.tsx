// src/pages/OnboardingAlunoQuestionarioSaude.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { toast } from "sonner";

const OnboardingAlunoQuestionarioSaude = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useAlunoProfile();
  
  const [respostas, setRespostas] = useState<Record<string, string | null>>({
    questao1: null,
    questao2: null,
    questao3: null,
    questao4: null,
    questao5: null,
    questao6: null,
    questao7: null,
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const questoes = [
    "Você possui algum problema cardíaco?",
    "Você sente dor no peito quando faz atividade física?",
    "No último mês, você sentiu dor no peito quando não estava fazendo atividade física?",
    "Você já perdeu o equilíbrio por tonturas ou perdeu a consciência?",
    "Você tem algum problema ósseo ou articular que poderia ser agravado pela atividade física?",
    "Você toma medicamentos para pressão arterial ou problemas cardíacos?",
    "Você tem conhecimento de alguma razão pela qual não deveria fazer atividade física?"
  ];

  const handleRespostaChange = (questaoIndex: number, valor: string) => {
    setRespostas(prev => ({
      ...prev,
      [`questao${questaoIndex + 1}`]: valor
    }));
  };

  const handleFinish = async () => {
    setIsLoading(true);

    try {
      // Salvar respostas e marcar onboarding como completo
      const success = await updateProfile({
        par_q_respostas: respostas,
        onboarding_completo: true
      });

      if (success) {
        toast.success("Questionário concluído com sucesso!");
        navigate('/index-aluno');
      } else {
        toast.error("Erro ao salvar respostas. Tente novamente.");
      }
    } catch (error) {
      console.error('Erro ao salvar questionário:', error);
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
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Questionário de Saúde</CardTitle>
            <p className="text-muted-foreground">
              Responda com sinceridade. Você pode pular questões que preferir não responder.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {questoes.map((questao, index) => {
                  const questaoKey = `questao${index + 1}`;
                  const valorAtual = respostas[questaoKey];
                  
                  return (
                    <div key={index} className="space-y-3 p-4 border rounded-lg bg-gray-50">
                      <p className="text-sm font-medium leading-relaxed text-gray-900">
                        {index + 1}. {questao}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`questao-${index}`}
                            value="sim"
                            checked={valorAtual === "sim"}
                            onChange={() => handleRespostaChange(index, "sim")}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`questao-${index}`}
                            value="nao"
                            checked={valorAtual === "nao"}
                            onChange={() => handleRespostaChange(index, "nao")}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">Não</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`questao-${index}`}
                            value="prefiro_nao_responder"
                            checked={valorAtual === "prefiro_nao_responder"}
                            onChange={() => handleRespostaChange(index, "prefiro_nao_responder")}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium text-gray-700">Prefiro não responder</span>
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
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                Anterior
              </Button>
              <Button 
                onClick={handleFinish}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? "Finalizando..." : "Finalizar questionário"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnboardingAlunoQuestionarioSaude;