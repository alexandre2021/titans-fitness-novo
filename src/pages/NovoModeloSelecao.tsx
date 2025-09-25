import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookCopy, Repeat, Loader2, Check, Plus, Search, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExercicioModelo, SerieModelo } from "./EditarModelo"; // Reutilizando tipos
import CustomSelect from "@/components/ui/CustomSelect";

type ModeloRotina = Tables<'modelos_rotina'>;
type Aluno = Pick<Tables<'alunos'>, 'id' | 'nome_completo'>;

const OBJETIVOS = ['Ganho de massa', 'Emagrecimento', 'Definição muscular', 'Condicionamento físico', 'Reabilitação', 'Performance esportiva'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];
const FREQUENCIAS = [1, 2, 3, 4, 5, 6, 7];

const OBJETIVOS_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...OBJETIVOS.map(o => ({ value: o, label: o }))];
const DIFICULDADES_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...DIFICULDADES.map(d => ({ value: d, label: d }))];
const FREQUENCIAS_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...FREQUENCIAS.map(f => ({ value: String(f), label: `${f}x / semana` }))];

const NovoModeloSelecao = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const alunoId = searchParams.get('alunoId');

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [modelos, setModelos] = useState<ModeloRotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  const [showFilters, setShowFilters] = useState(false);
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
        // MUDANÇA: Verificar se o professor tem permissão para ver este aluno (se o aluno o segue)
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

        // Fetch Modelos
        const { data: modelosData, error: modelosError } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('professor_id', user.id)
          .order('created_at', { ascending: false });

        if (modelosError) throw modelosError;
        setModelos(modelosData || []);
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
      navigate(`/rotinas-criar/${alunoId}`);

    } catch (error) {
      console.error("Erro ao selecionar modelo:", error);
      toast.error("Erro ao selecionar modelo", {
        description: "Não foi possível carregar os dados do modelo selecionado."
      })
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
            variant="default"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0 md:hidden relative h-10 w-10 rounded-full p-0 [&_svg]:size-6"
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
                  value={OBJETIVOS_OPTIONS.find(opt => opt.value === filtros.objetivo)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, objetivo: option ? String(option.value) : 'todos' }))}
                  options={OBJETIVOS_OPTIONS}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-dificuldade">Dificuldade</Label>
                <CustomSelect
                  inputId="filtro-dificuldade"
                  value={DIFICULDADES_OPTIONS.find(opt => opt.value === filtros.dificuldade)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, dificuldade: option ? String(option.value) : 'todos' }))}
                  options={DIFICULDADES_OPTIONS}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-frequencia">Frequência</Label>
                <CustomSelect
                  inputId="filtro-frequencia"
                  value={FREQUENCIAS_OPTIONS.find(opt => opt.value === filtros.frequencia)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, frequencia: option ? String(option.value) : 'todos' }))}
                  options={FREQUENCIAS_OPTIONS}
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
