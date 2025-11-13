import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BookCopy, Repeat, Loader2, Check, Plus, Search, Filter, X, Target, BicepsFlexed, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExercicioModelo, SerieModelo } from "./EditarModelo"; // Reutilizando tipos
import CustomSelect from "@/components/ui/CustomSelect";
import { FILTRO_DIFICULDADES_OPTIONS, FILTRO_FREQUENCIAS_OPTIONS, FILTRO_OBJETIVOS_OPTIONS } from "@/constants/rotinas";

type ModeloRotina = Tables<'modelos_rotina'>;
type Aluno = Pick<Tables<'alunos'>, 'id' | 'nome_completo'>;

const NovoModeloSelecao = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const alunoId = searchParams.get('alunoId');

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [modelosPadrao, setModelosPadrao] = useState<ModeloRotina[]>([]);
  const [modelosPersonalizados, setModelosPersonalizados] = useState<ModeloRotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'padrao' | 'personalizado'>('padrao');
  const [selecionandoModeloId, setSelecionandoModeloId] = useState<string | null>(null);

  const temFiltrosAvancadosAtivos = filtros.objetivo !== 'todos' || filtros.dificuldade !== 'todos' || filtros.frequencia !== 'todos';

  const temFiltrosAtivos = temFiltrosAvancadosAtivos || filtros.busca !== '';

  const limparFiltros = () => {
    setFiltros({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  };

  useEffect(() => {
    if (!alunoId) {
      toast.error("Erro", {
        description: "ID do aluno não fornecido."
      });
      navigate('/alunos');
      return;
    }

    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Verificar se o professor tem permissão para ver este aluno
        const { data: relacao, error: relacaoError } = await supabase.from('alunos_professores').select('aluno_id').eq('aluno_id', alunoId).eq('professor_id', user.id).single();

        if (relacaoError || !relacao) throw new Error("Você não tem permissão para ver este aluno.");

        // Fetch Aluno
        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo')
          .eq('id', alunoId)
          .single();

        if (alunoError || !alunoData) {
          toast.error("Erro", {
            description: "Aluno não encontrado."
          });
          navigate('/alunos');
          return;
        }
        setAluno(alunoData);

        // Fetch Modelos Padrão (admin) e Personalizados (do professor)
        const { data: modelosPadraoData, error: padraoError } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('tipo', 'padrao')
          .order('created_at', { ascending: false });

        const { data: modelosPersonalizadosData, error: personalizadosError } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('tipo', 'personalizado')
          .eq('professor_id', user.id)
          .order('created_at', { ascending: false });

        if (padraoError) throw padraoError;
        if (personalizadosError) throw personalizadosError;

        setModelosPadrao(modelosPadraoData || []);
        setModelosPersonalizados(modelosPersonalizadosData || []);
      } catch (error) {
        toast.error("Erro ao carregar dados", {
          description: "Não foi possível carregar os modelos. Tente novamente."
        })
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, alunoId, navigate]);

  const handleSelecionarModelo = async (modelo: ModeloRotina) => {
    if (!alunoId || !aluno) return;
    setSelecionandoModeloId(modelo.id);

    try {
      // 1. Buscar todos os dados do modelo
      const { data: treinosModelo, error: treinosError } = await supabase.from("modelos_treino").select("*").eq("modelo_rotina_id", modelo.id).order("ordem");
      if (treinosError) throw treinosError;

      const treinosRotina = treinosModelo.map((t, index) => ({
        id: `treino_draft_${Date.now()}_${index}`,
        nome: t.nome || `Treino ${String.fromCharCode(65 + index)}`,
        grupos_musculares: t.grupos_musculares || [],
        observacoes: t.observacoes || undefined,
        ordem: t.ordem,
      }));

      const exerciciosPorTreinoRotina: Record<string, ExercicioModelo[]> = {};

      for (let i = 0; i < treinosModelo.length; i++) {
        const treinoModelo = treinosModelo[i];
        const treinoRotina = treinosRotina[i]; // Corresponding new treino

        const { data: exerciciosModelo, error: exerciciosError } = await supabase.from("modelos_exercicio").select("*, modelos_serie(*)").eq("modelo_treino_id", treinoModelo.id).order("ordem");
        if (exerciciosError) throw exerciciosError;

        exerciciosPorTreinoRotina[treinoRotina.id] = exerciciosModelo.map(ex => ({
          id: `ex_draft_${Date.now()}_${Math.random()}`,
          exercicio_1_id: ex.exercicio_1_id,
          exercicio_2_id: ex.exercicio_2_id || undefined,
          tipo: ex.exercicio_2_id ? 'combinada' : 'simples',
          series: ex.modelos_serie.map((s: Tables<'modelos_serie'>) => ({
            id: `serie_draft_${Date.now()}_${Math.random()}`,
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

      // 2. Montar o objeto para o sessionStorage
      const rotinaStorageData = {
        configuracao: {
          nome: `${modelo.nome} (para ${aluno.nome_completo})`,
          objetivo: modelo.objetivo || '',
          dificuldade: modelo.dificuldade || '',
          duracao_semanas: modelo.duracao_semanas,
          treinos_por_semana: modelo.treinos_por_semana,
          data_inicio: new Date().toISOString().split('T')[0],
          descricao: modelo.observacoes_rotina || ''
        },
        treinos: treinosRotina,
        exercicios: exerciciosPorTreinoRotina,
        etapaAtual: 'configuracao',
      };

      // 3. Salvar no sessionStorage e navegar para a página de criação
      sessionStorage.setItem(`rotina_em_criacao_${alunoId}`, JSON.stringify(rotinaStorageData));
      navigate(`/rotinas-criar/${alunoId}`, { state: { from: location.state?.from } });

    } catch (error) {
      console.error("Erro ao selecionar modelo:", error);
      toast.error("Erro ao selecionar modelo", {
        description: "Não foi possível carregar os dados do modelo selecionado."
      })
    } finally {
      setSelecionandoModeloId(null);
    }
  };

  const filtrarModelos = (modelos: ModeloRotina[]) => {
    return modelos.filter(modelo => {
      const buscaMatch = filtros.busca === '' || modelo.nome.toLowerCase().includes(filtros.busca.toLowerCase());
      const objetivoMatch = filtros.objetivo === 'todos' || modelo.objetivo === filtros.objetivo;
      const dificuldadeMatch = filtros.dificuldade === 'todos' || modelo.dificuldade === filtros.dificuldade;
      const frequenciaMatch = filtros.frequencia === 'todos' || String(modelo.treinos_por_semana) === filtros.frequencia;
      return buscaMatch && objetivoMatch && dificuldadeMatch && frequenciaMatch;
    });
  };

  const modelosPadraoFiltrados = filtrarModelos(modelosPadrao);
  const modelosPersonalizadosFiltrados = filtrarModelos(modelosPersonalizados);

  const renderModelosGrid = (modelos: ModeloRotina[]) => {
    if (modelos.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum modelo encontrado</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {activeTab === 'padrao'
                ? 'Não há modelos padrão disponíveis no momento.'
                : 'Você ainda não criou nenhum modelo personalizado. Crie um na seção "Meus Modelos".'}
            </p>
            {activeTab === 'personalizado' && (
              <Button onClick={() => navigate('/meus-modelos')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Modelo
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4 pb-20 md:pb-0 max-w-5xl mx-auto">
        {modelos.map((modelo) => (
          <div key={modelo.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold">{modelo.nome}</h4>
                {activeTab === 'personalizado' && modelo.created_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Criado em: {new Date(modelo.created_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-2 mt-2">
                  {modelo.tipo === 'padrao' ? (
                    <Badge className="bg-blue-100 text-blue-800">Padrão</Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-800">Personalizado</Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleSelecionarModelo(modelo)}
                disabled={selecionandoModeloId === modelo.id}
                className="flex-shrink-0"
              >
                {selecionandoModeloId === modelo.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" />Selecionar</>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Objetivo</p>
                  <p className="font-medium capitalize">{modelo.objetivo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BicepsFlexed className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Dificuldade</p>
                  <p className="font-medium capitalize">{modelo.dificuldade}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">{modelo.duracao_semanas} semanas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Frequência</p>
                  <p className="font-medium">{modelo.treinos_por_semana}x por semana</p>
                </div>
              </div>
            </div>
            {modelo.observacoes_rotina && (
              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                <p className="text-sm">{modelo.observacoes_rotina}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando modelos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Desktop */}
      {isDesktop && (
        <div className="flex items-center justify-between">
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
        </div>
      )}

      {/* Busca e Filtros */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar modelos..."
              value={filtros.busca}
              onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0 md:hidden relative h-10 w-10 p-0 [&_svg]:size-6"
            aria-label="Mostrar filtros"
          >
            <Filter />
            {temFiltrosAvancadosAtivos && (
              <span className="absolute top-[-2px] left-[-2px] block h-3 w-3 rounded-full bg-secondary ring-2 ring-white" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="hidden md:flex items-center gap-2 relative"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {temFiltrosAvancadosAtivos && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-1 ring-background" />
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="p-4 border rounded-lg bg-background">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-objetivo">Objetivo</Label>
                <CustomSelect
                  inputId="filtro-objetivo"
                  value={FILTRO_OBJETIVOS_OPTIONS.find(opt => opt.value === filtros.objetivo)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, objetivo: option ? String(option.value) : 'todos' }))}
                  options={FILTRO_OBJETIVOS_OPTIONS}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-dificuldade">Dificuldade</Label>
                <CustomSelect
                  inputId="filtro-dificuldade"
                  value={FILTRO_DIFICULDADES_OPTIONS.find(opt => opt.value === filtros.dificuldade)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, dificuldade: option ? String(option.value) : 'todos' }))}
                  options={FILTRO_DIFICULDADES_OPTIONS}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-frequencia">Frequência</Label>
                <CustomSelect
                  inputId="filtro-frequencia"
                  value={FILTRO_FREQUENCIAS_OPTIONS.find(opt => opt.value === filtros.frequencia)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, frequencia: option ? String(option.value) : 'todos' }))}
                  options={FILTRO_FREQUENCIAS_OPTIONS}
                />
              </div>
              {temFiltrosAtivos && (
                <Button variant="outline" size="sm" onClick={limparFiltros} className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs: Aplicativo / Meus Modelos */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'padrao' | 'personalizado')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto md:mx-0">
          <TabsTrigger value="padrao">
            Aplicativo ({modelosPadrao.length})
          </TabsTrigger>
          <TabsTrigger value="personalizado">
            Meus Modelos ({modelosPersonalizados.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Padrão */}
        <TabsContent value="padrao" className="space-y-4">
          {renderModelosGrid(modelosPadraoFiltrados)}
        </TabsContent>

        {/* Tab Content: Personalizados */}
        <TabsContent value="personalizado" className="space-y-4">
          {renderModelosGrid(modelosPersonalizadosFiltrados)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NovoModeloSelecao;
