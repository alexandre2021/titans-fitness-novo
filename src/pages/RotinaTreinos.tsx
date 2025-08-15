// src/pages/RotinaTreinos.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, GripVertical, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRotinaStorage } from '@/hooks/useRotinaStorage';
import { TreinoTemp, LIMITES } from '@/types/rotina.types';

// Grupos musculares disponíveis (do padrão existente)
const GRUPOS_MUSCULARES = [
  'Peito',
  'Costas', 
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Pernas',
  'Glúteos',
  'Panturrilha'
];

// Cores para badges dos grupos musculares
const CORES_GRUPOS_MUSCULARES: {[key: string]: string} = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800',
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-green-100 text-green-800',
  'Panturrilha': 'bg-green-100 text-green-800'
};

const RotinaTreinos = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const rotinaStorage = useRotinaStorage(alunoId!);

  const [treinos, setTreinos] = useState<TreinoTemp[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Limpar storage ao sair da página (hook sempre no topo)
  useEffect(() => {
    const handleBeforeUnload = () => {
      rotinaStorage.limparStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rotinaStorage]);

  // Verificar se tem configuração salva (hook sempre no topo)
  useEffect(() => {
    if (!rotinaStorage.isLoaded) return;
    if (!rotinaStorage.storage.configuracao) {
      toast({
        title: "Configuração não encontrada",
        description: "Complete a configuração antes de definir os treinos.",
        variant: "destructive"
      });
      navigate(`/rotinas-criar/${alunoId}/configuracao`);
      return;
    }
    const treinosSalvos = rotinaStorage.storage.treinos;
    if (treinosSalvos && treinosSalvos.length > 0) {
      setTreinos(treinosSalvos);
    } else {
      const frequencia = rotinaStorage.storage.configuracao.treinos_por_semana;
      const treinosIniciais: TreinoTemp[] = [];
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      for (let i = 0; i < frequencia; i++) {
        treinosIniciais.push({
          nome: `Treino ${nomesTreinos[i]}`,
          grupos_musculares: [],
          observacoes: '',
          ordem: i + 1,
          tempo_estimado_minutos: 60
        });
      }
      setTreinos(treinosIniciais);
    }
  }, [alunoId, navigate, toast, rotinaStorage.isLoaded, rotinaStorage.storage]);

  // Adicionar grupo muscular a um treino
  const adicionarGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => {
      if (index === treinoIndex && !treino.grupos_musculares.includes(grupo)) {
        return {
          ...treino,
          grupos_musculares: [...treino.grupos_musculares, grupo]
        };
      }
      return treino;
    }));
  };

  // Remover grupo muscular de um treino
  const removerGrupoMuscular = (treinoIndex: number, grupo: string) => {
    setTreinos(prev => prev.map((treino, index) => {
      if (index === treinoIndex) {
        return {
          ...treino,
          grupos_musculares: treino.grupos_musculares.filter(g => g !== grupo)
        };
      }
      return treino;
    }));
  };

  // Atualizar campo de treino
  const atualizarTreino = (treinoIndex: number, campo: keyof TreinoTemp, valor: string | number | boolean) => {
    setTreinos(prev => prev.map((treino, index) => {
      if (index === treinoIndex) {
        return { ...treino, [campo]: valor };
      }
      return treino;
    }));
  };

  // Calcular treinos completos
  const treinosCompletos = treinos.filter(t => 
    t.nome && t.nome.trim().length >= 2 && t.grupos_musculares.length > 0
  ).length;

  // Salvar e avançar
  const handleProximo = async () => {
    console.log('🔍 Clicou próximo! Treinos completos:', treinosCompletos, 'Total:', treinos.length);
    // Verificar se atende aos requisitos
    if (treinosCompletos !== treinos.length) {
      console.log('⚠️ Requisitos não atendidos - fazendo scroll');
      // Rolar para o card de requisitos
      const requisitoCard = document.querySelector('[data-requisito-card]');
      console.log('📍 Card encontrado:', requisitoCard);
      if (requisitoCard) {
        requisitoCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        console.log('📜 Scroll executado');
      }
      return; // Não prosseguir
    }

    console.log('✅ Requisitos atendidos - prosseguindo');
    setSalvando(true);
    try {
      await rotinaStorage.salvarTreinos(treinos);
      navigate(`/rotinas-criar/${alunoId}/exercicios`);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar treinos.",
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  // Cancelar: limpa storage e volta para lista de rotinas do aluno
  const handleCancelar = () => {
    rotinaStorage.limparStorage();
    navigate(`/alunos-rotinas/${alunoId}`);
  };

  // Voltar: retorna para etapa de configuração (sem limpar storage)
  const handleVoltar = () => {
    navigate(`/rotinas-criar/${alunoId}/configuracao`);
  };


  // Função para scroll suave até o card de requisitos
  const handleScrollRequisitos = () => {
    const requisitoCard = document.querySelector('[data-requisito-card]');
    if (requisitoCard) {
      requisitoCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  // Obter resumo da configuração
  const configuracao = rotinaStorage.storage.configuracao;

  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Nova Rotina</span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm font-medium">Treinos</span>
        </div>
        <div className="text-sm text-gray-500">
          Etapa 2 de 4
        </div>
      </div>

      {/* Card de Requisitos */}
      <Card className="bg-blue-50 border-blue-200" data-requisito-card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-blue-900">Requisitos para continuar:</p>
              <p className="text-sm text-blue-700">Adicione pelo menos 1 grupo muscular em cada treino</p>
            </div>
            <Badge className={treinosCompletos === treinos.length ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}>
              {treinosCompletos}/{treinos.length} completos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de treinos */}
      <div className="space-y-4">
        {treinos.map((treino, index) => {
          const treinoCompleto = treino.nome && treino.nome.trim().length >= 2 && treino.grupos_musculares.length > 0;
          
          return (
            <Card key={index} className={treinoCompleto ? "border-green-200" : "border-gray-200"}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center">
                    <GripVertical className="h-5 w-5 mr-2 text-gray-400" />
                    Treino {String.fromCharCode(65 + index)} {/* A, B, C... */}
                  </div>
                  {treinoCompleto && (
                    <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
                      <Check className="h-3 w-3 mr-1" />
                      Requisitos
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome do treino */}
                <div className="space-y-2">
                  <Label htmlFor={`nome_${index}`}>
                    Nome do Treino <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`nome_${index}`}
                    value={treino.nome}
                    onChange={(e) => atualizarTreino(index, 'nome', e.target.value)}
                    placeholder={`Ex: Treino ${String.fromCharCode(65 + index)} - Peito e Tríceps`}
                  />
                </div>

                {/* Grupos musculares selecionados */}
                <div className="space-y-2">
                  <Label>
                    Grupos Musculares <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-gray-50">
                    {treino.grupos_musculares.length > 0 ? (
                      treino.grupos_musculares.map(grupo => (
                        <Badge 
                          key={grupo} 
                          variant="secondary"
                          className={`${CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100 text-gray-800'} cursor-pointer hover:opacity-80`}
                          onClick={() => removerGrupoMuscular(index, grupo)}
                        >
                          {grupo}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">Selecione os grupos musculares abaixo</span>
                    )}
                  </div>
                </div>

                {/* Grupos musculares disponíveis */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Adicionar Grupos:</Label>
                  <div className="flex flex-wrap gap-2">
                    {GRUPOS_MUSCULARES.filter(grupo => !treino.grupos_musculares.includes(grupo)).map(grupo => (
                      <Badge 
                        key={grupo}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => adicionarGrupoMuscular(index, grupo)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {grupo}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tempo estimado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`tempo_${index}`}>Tempo Estimado (minutos)</Label>
                    <Input
                      id={`tempo_${index}`}
                      type="number"
                      min="15"
                      max="180"
                      value={treino.tempo_estimado_minutos || ''}
                      onChange={(e) => atualizarTreino(index, 'tempo_estimado_minutos', parseInt(e.target.value) || undefined)}
                      placeholder="Ex: 60"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor={`observacoes_${index}`}>Observações</Label>
                  <Textarea
                    id={`observacoes_${index}`}
                    value={treino.observacoes || ''}
                    onChange={(e) => atualizarTreino(index, 'observacoes', e.target.value)}
                    placeholder="Observações específicas para este treino..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botões de navegação */}
      <div className="flex justify-between pt-6">
        <div>
          <Button variant="ghost" onClick={handleVoltar} disabled={salvando}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancelar} disabled={salvando}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <div onClick={treinosCompletos !== treinos.length ? handleScrollRequisitos : handleProximo}>
            <Button 
              disabled={salvando || treinosCompletos !== treinos.length}
              className="w-full"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  Próximo: Exercícios
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotinaTreinos;