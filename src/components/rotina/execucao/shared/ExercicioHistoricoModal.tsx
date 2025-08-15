// src/components/rotina/execucao/shared/ExercicioHistoricoModal.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Calendar, Weight, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  visible: boolean;
  exercicioId: string;
  treinoId: string;
  alunoId: string;
  onClose: () => void;
}

interface HistoricoExecucao {
  data_execucao: string;
  carga_executada_1: number;
  repeticoes_executadas_1: number;
  carga_executada_2?: number;
  repeticoes_executadas_2?: number;
  observacoes?: string;
  tempo_total_minutos: number;
  modo_execucao: string;
}

// ✅ TIPAGEM CORRIGIDA para dados vindos do Supabase
interface HistoricoSupabase {
  repeticoes_executadas_1: number | null;
  carga_executada_1: number | null;
  repeticoes_executadas_2: number | null;
  carga_executada_2: number | null;
  observacoes: string | null;
  execucoes_sessao: {
    data_execucao: string;
    tempo_total_minutos: number | null;
    modo_execucao: string | null;
    rotinas: {
      aluno_id: string;
    };
  };
  exercicios_rotina: {
    exercicio_1_id: string;
    exercicio_2_id: string | null;
  };
}

interface ExercicioSupabase {
  nome: string;
}

export const ExercicioHistoricoModal = ({ 
  visible, 
  exercicioId, 
  treinoId, 
  alunoId, 
  onClose 
}: Props) => {
  const [historico, setHistorico] = useState<HistoricoExecucao[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercicioNome, setExercicioNome] = useState('');

  const carregarHistorico = useCallback(async () => {
    if (!exercicioId || !alunoId) return;
    
    console.log('🔍 Carregando histórico para:', { exercicioId, alunoId });
    
    try {
      setLoading(true);
      
      // Buscar nome do exercício
      const { data: exercicioRaw, error: exercicioError } = await supabase
        .from('exercicios')
        .select('nome')
        .eq('id', exercicioId)
        .single();
      
      if (exercicioError) {
        console.error('❌ Erro ao buscar exercício:', exercicioError);
      } else if (exercicioRaw) {
        const exercicio = exercicioRaw as ExercicioSupabase;
        setExercicioNome(exercicio.nome);
        console.log('✅ Exercício encontrado:', exercicio.nome);
      }

      // ✅ QUERY CORRIGIDA - Abordagem diferente sem ORDER BY problemático
      const { data: historicoRaw, error: historicoError } = await supabase
        .from('execucoes_series')
        .select(`
          repeticoes_executadas_1,
          carga_executada_1,
          repeticoes_executadas_2,
          carga_executada_2,
          observacoes,
          execucoes_sessao!inner(
            data_execucao,
            tempo_total_minutos,
            modo_execucao,
            rotinas!inner(
              aluno_id
            )
          ),
          exercicios_rotina!inner(
            exercicio_1_id,
            exercicio_2_id
          )
        `)
        .eq('exercicios_rotina.exercicio_1_id', exercicioId)
        .eq('execucoes_sessao.rotinas.aluno_id', alunoId)
        .limit(10);

      console.log('📊 Query executada:', {
        exercicioId,
        alunoId,
        error: historicoError,
        resultCount: historicoRaw?.length || 0
      });

      if (historicoError) {
        console.error('❌ Erro ao carregar histórico:', historicoError);
        setHistorico([]);
        return;
      }

      if (!historicoRaw || historicoRaw.length === 0) {
        console.log('📭 Nenhum histórico encontrado');
        setHistorico([]);
        return;
      }

      // ✅ Formatação com tipagem correta e ordenação manual
      const historicoFormatado: HistoricoExecucao[] = (historicoRaw as HistoricoSupabase[])
        .map((item) => ({
          data_execucao: item.execucoes_sessao.data_execucao,
          carga_executada_1: item.carga_executada_1 || 0,
          repeticoes_executadas_1: item.repeticoes_executadas_1 || 0,
          carga_executada_2: item.carga_executada_2 || undefined,
          repeticoes_executadas_2: item.repeticoes_executadas_2 || undefined,
          observacoes: item.observacoes || undefined,
          tempo_total_minutos: item.execucoes_sessao.tempo_total_minutos || 0,
          modo_execucao: item.execucoes_sessao.modo_execucao || 'pt'
        }))
        .sort((a, b) => new Date(b.data_execucao).getTime() - new Date(a.data_execucao).getTime()); // ✅ Ordenação manual

      console.log('✅ Histórico formatado:', historicoFormatado);
      setHistorico(historicoFormatado);
      
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar histórico:', error);
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  }, [exercicioId, alunoId]);

  useEffect(() => {
    if (visible && exercicioId) {
      carregarHistorico();
    }
  }, [visible, exercicioId, carregarHistorico]);

  const formatarData = useCallback((dataISO: string): string => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const calcularDiasAtras = useCallback((dataISO: string): string => {
    const data = new Date(dataISO);
    const hoje = new Date();
    const diffTime = hoje.getTime() - data.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    return `${diffDays} dias atrás`;
  }, []);

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Histórico de Execuções</span>
          </DialogTitle>
          {exercicioNome && (
            <p className="text-muted-foreground">{exercicioNome}</p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : historico.length > 0 ? (
          <div className="space-y-4">
            {historico.map((execucao, index) => (
              <Card key={index} className="transition-colors hover:bg-accent/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatarData(execucao.data_execucao)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {calcularDiasAtras(execucao.data_execucao)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Repeat className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">
                        <span className="font-medium">{execucao.repeticoes_executadas_1}</span> repetições
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Weight className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        <span className="font-medium">{execucao.carga_executada_1}</span> kg
                      </span>
                    </div>
                  </div>

                  {/* Exercício 2 para séries combinadas */}
                  {execucao.repeticoes_executadas_2 && execucao.carga_executada_2 && (
                    <div className="grid grid-cols-2 gap-4 mb-3 pt-2 border-t border-border">
                      <div className="flex items-center space-x-2">
                        <Repeat className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">
                          <span className="font-medium">{execucao.repeticoes_executadas_2}</span> repetições (2º)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Weight className="h-4 w-4 text-green-500" />
                        <span className="text-sm">
                          <span className="font-medium">{execucao.carga_executada_2}</span> kg (2º)
                        </span>
                      </div>
                    </div>
                  )}

                  {execucao.observacoes && (
                    <div className="bg-muted/50 p-2 rounded text-sm text-muted-foreground">
                      <strong>Obs:</strong> {execucao.observacoes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {historico.length >= 10 && (
              <p className="text-center text-sm text-muted-foreground">
                Mostrando últimas 10 execuções
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma execução anterior encontrada.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Este será seu primeiro registro para este exercício.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};