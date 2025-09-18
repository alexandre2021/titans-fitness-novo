import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookCopy, Repeat, Loader2, Check, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FiltrosRotinaModelo } from "@/components/rotinasModelo/FiltrosRotinaModelo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExercicioModelo, SerieModelo } from "./EditarModelo"; // Reutilizando tipos

type ModeloRotina = Tables<'modelos_rotina'>;
type Aluno = Pick<Tables<'alunos'>, 'id' | 'nome_completo'>;

const OBJETIVOS = ['Ganho de massa', 'Emagrecimento', 'Definição muscular', 'Condicionamento físico', 'Reabilitação', 'Performance esportiva'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];
const FREQUENCIAS = [1, 2, 3, 4, 5, 6, 7];

const NovoModeloSelecao = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const alunoId = searchParams.get('alunoId');

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [modelos, setModelos] = useState<ModeloRotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  const [selecionandoModeloId, setSelecionandoModeloId] = useState<string | null>(null);

  useEffect(() => {
    if (!alunoId) {
      toast({ title: "Erro", description: "ID do aluno não fornecido.", variant: "destructive" });
      navigate('/alunos');
      return;
    }

    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch Aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo')
          .eq('id', alunoId)
          .eq('personal_trainer_id', user.id)
          .single();

        if (alunoError || !alunoData) {
          toast({ title: "Erro", description: "Aluno não encontrado.", variant: "destructive" });
          navigate('/alunos');
          return;
        }
        setAluno(alunoData);

        // Fetch Modelos
        const { data: modelosData, error: modelosError } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('personal_trainer_id', user.id)
          .order('created_at', { ascending: false });

        if (modelosError) throw modelosError;
        setModelos(modelosData || []);
      } catch (error) {
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os modelos. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, alunoId, navigate, toast]);

  const handleSelecionarModelo = async (modelo: ModeloRotina) => {
    if (!alunoId || !aluno) return;
    setSelecionandoModeloId(modelo.id);

    try {
      // 1. Fetch all model data
      const { data: treinosModelo, error: treinosError } = await supabase.from("modelos_treino").select("*").eq("modelo_rotina_id", modelo.id).order("ordem");
      if (treinosError) throw treinosError;

      // Create new treinos for the routine with new IDs
      const treinosRotina = treinosModelo.map(t => ({
        ...t,
        id: `treino_rotina_${Date.now()}_${Math.random()}`, // New temp ID
        grupos_musculares: t.grupos_musculares || [], // Ensure it's an array
      }));

      const exerciciosPorTreinoRotina: Record<string, ExercicioModelo[]> = {};
      
      for (let i = 0; i < treinosModelo.length; i++) {
        const treinoModelo = treinosModelo[i];
        const treinoRotina = treinosRotina[i]; // Corresponding new treino

        const { data: exerciciosModelo, error: exerciciosError } = await supabase.from("modelos_exercicio").select("*, modelos_serie(*)").eq("modelo_treino_id", treinoModelo.id).order("ordem");
        if (exerciciosError) throw exerciciosError;

        exerciciosPorTreinoRotina[treinoRotina.id] = exerciciosModelo.map(ex => ({
          id: `ex_rotina_${Date.now()}_${Math.random()}`, // New ID for the routine exercise
          exercicio_1_id: ex.exercicio_1_id,
          exercicio_2_id: ex.exercicio_2_id || undefined,
          tipo: ex.exercicio_2_id ? 'combinada' : 'simples',
          series: ex.modelos_serie.map((s: Tables<'modelos_serie'>) => ({
            id: `serie_rotina_${Date.now()}_${Math.random()}`, // New ID for the routine serie
            numero_serie: s.numero_serie,
            repeticoes: s.repeticoes ?? undefined,
            carga: s.carga ?? undefined,
            repeticoes_1: s.repeticoes_1 ?? undefined,
            carga_1: s.carga_1 ?? undefined,
            repeticoes_2: s.repeticoes_2 ?? undefined,
            carga_2: s.carga_2 ?? undefined,
            tem_dropset: s.tem_dropset ?? undefined,
            carga_dropset: s.carga_dropset ?? undefined,
            intervalo_apos_serie: s.intervalo_apos_serie ?? undefined,
          })).sort((a, b) => a.numero_serie - b.numero_serie),
          intervalo_apos_exercicio: ex.intervalo_apos_exercicio ?? undefined,
        }));
      }

      // 2. Build the object for sessionStorage
      const rotinaStorageData = {
        alunoId: alunoId,
        configuracao: {
          nome: `Rotina de ${aluno.nome_completo} (Baseado em ${modelo.nome})`,
          objetivo: modelo.objetivo,
          dificuldade: modelo.dificuldade,
          duracao_semanas: modelo.duracao_semanas,
          treinos_por_semana: modelo.treinos_por_semana,
          valor_total: 0,
          forma_pagamento: 'PIX',
          data_inicio: new Date().toISOString().split('T')[0],
          observacoes_pagamento: '',
          permite_execucao_aluno: true,
          descricao: modelo.observacoes_rotina || ''
        },
        treinos: treinosRotina,
        exercicios: exerciciosPorTreinoRotina,
        etapaAtual: 'configuracao',
      };

      // 3. Save to sessionStorage and navigate
      sessionStorage.setItem('rotina_em_criacao', JSON.stringify(rotinaStorageData));
      navigate(`/rotinas-criar/${alunoId}/configuracao`);

    } catch (error) {
      console.error("Erro ao selecionar modelo:", error);
      toast({
        title: "Erro ao selecionar modelo",
        description: "Não foi possível carregar os dados do modelo selecionado.",
        variant: "destructive",
      });
    } finally {
      setSelecionandoModeloId(null);
    }
  };

  const modelosFiltrados = modelos.filter(modelo => {
    const buscaMatch = filtros.busca === '' || modelo.nome.toLowerCase().includes(filtros.busca.toLowerCase());
    const objetivoMatch = filtros.objetivo === 'todos' || modelo.objetivo === filtros.objetivo;
    const dificuldadeMatch = filtros.dificuldade === 'todos' || modelo.dificuldade === filtros.dificuldade;
    const frequenciaMatch = filtros.frequencia === 'todos' || String(modelo.treinos_por_semana) === filtros.frequencia;
    return buscaMatch && objetivoMatch && dificuldadeMatch && frequenciaMatch;
  });

  const getBadgeColor = (type: 'objetivo' | 'dificuldade', value: string) => {
    if (type === 'dificuldade') {
      if (value === 'Baixa') return 'bg-green-100 text-green-800 ';
      if (value === 'Média') return 'bg-yellow-100 text-yellow-800';
      if (value === 'Alta') return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(`/alunos-rotinas/${alunoId}`)}
          className="h-10 w-10 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Selecionar Modelo</h1>
          <p className="text-muted-foreground">
            Escolha um modelo para criar a rotina de {aluno?.nome_completo || 'aluno'}
          </p>
        </div>
      </div>

      <FiltrosRotinaModelo
        filtros={filtros}
        onFiltrosChange={setFiltros}
        objetivos={OBJETIVOS}
        dificuldades={DIFICULDADES}
        frequencias={FREQUENCIAS}
      />

      {modelosFiltrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum modelo encontrado</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {modelos.length === 0 ? 'Você ainda não criou nenhum modelo. Crie um na seção "Meus Modelos".' : 'Tente ajustar os filtros ou o termo de busca.'}
            </p>
            {modelos.length === 0 && (
              <Button onClick={() => navigate('/meus-modelos')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Modelo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modelosFiltrados.map((modelo) => (
            <Card key={modelo.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{modelo.nome}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Criado em: {modelo.created_at ? new Date(modelo.created_at).toLocaleDateString('pt-BR') : 'Data indisponível'}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{modelo.treinos_por_semana} treinos/semana</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modelo.objetivo && <Badge variant="outline" className={getBadgeColor('objetivo', modelo.objetivo)}>{modelo.objetivo}</Badge>}
                    {modelo.dificuldade && <Badge variant="outline" className={getBadgeColor('dificuldade', modelo.dificuldade)}>{modelo.dificuldade}</Badge>}
                  </div>
                </div>
                <Button
                  onClick={() => handleSelecionarModelo(modelo)}
                  disabled={selecionandoModeloId === modelo.id}
                  className="w-full mt-6"
                >
                  {selecionandoModeloId === modelo.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Selecionar</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NovoModeloSelecao;
