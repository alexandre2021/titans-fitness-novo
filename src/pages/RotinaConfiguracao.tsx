// src/pages/RotinaConfiguracao.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRotinaStorage } from '@/hooks/useRotinaStorage';
import { supabase } from '@/integrations/supabase/client';
import { 
  ConfiguracaoRotina, 
  OBJETIVOS, 
  DIFICULDADES, 
  FORMAS_PAGAMENTO,
  LIMITES,
  Aluno,
  Objetivo,        // ← ADICIONAR
  Dificuldade,     // ← ADICIONAR  
  FormaPagamento   // ← ADICIONAR
} from '@/types/rotina.types';

const RotinaConfiguracao = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const rotinaStorage = useRotinaStorage(alunoId!);

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [form, setForm] = useState<ConfiguracaoRotina>({
    nome: '',
    objetivo: 'Ganho de massa',
    dificuldade: 'Média',
    duracao_semanas: 12,
    treinos_por_semana: 3,
    valor_total: 0,
    forma_pagamento: 'PIX',
    data_inicio: new Date().toISOString().split('T')[0],
    observacoes_pagamento: '',
    permite_execucao_aluno: true,
    descricao: ''
  });


  const [erros, setErros] = useState<{[key: string]: string}>({});

  // Limpa erro de nome automaticamente ao digitar um valor válido
  useEffect(() => {
    if (erros.nome && form.nome && form.nome.length >= LIMITES.NOME_MIN) {
      setErros(prev => {
        const { nome, ...rest } = prev;
        return rest;
      });
    }
  }, [form.nome, erros.nome]);

  // Carregar dados do aluno e dados salvos


  useEffect(() => {
    // Limpa cache de exercícios ao iniciar nova rotina
    sessionStorage.removeItem('rotina_exercicios');

    let jaRedirecionou = false;

    const carregarDados = async () => {
      if (!alunoId) return;

      try {
        // Verificar se aluno já possui rotina ativa
        const { data: rotinaAtiva } = await supabase
          .from('rotinas')
          .select('id, status')
          .eq('aluno_id', alunoId)
          .in('status', ['Ativa', 'Pausada'])
          .limit(1);

        if (rotinaAtiva && rotinaAtiva.length > 0 && !jaRedirecionou) {
          jaRedirecionou = true;
          toast({
            title: "Rotina já existe",
            description: "Este aluno já possui uma rotina ativa. Finalize ou cancele a rotina atual antes de criar uma nova.",
            variant: "destructive"
          });
          navigate(`/alunos-rotinas/${alunoId}`);
          return;
        }

        // Buscar dados do aluno
        const { data: alunoData, error } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', alunoId)
          .single();

        if (error || !alunoData) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do aluno.",
            variant: "destructive"
          });
          navigate('/alunos');
          return;
        }

        setAluno(alunoData);

        // Carregar configuração salva ou pré-preencher
        const configuracaoSalva = rotinaStorage.storage.configuracao;
        if (configuracaoSalva) {
          setForm(configuracaoSalva);
        } else {
          // Pré-preencher com dados do aluno
          const objetivo = alunoData.ultimo_objetivo_rotina || 'Ganho de massa';
          setForm(prev => ({
            ...prev,
            nome: `Rotina ${alunoData.nome_completo}`,
            objetivo: (OBJETIVOS as readonly string[]).includes(objetivo) ? objetivo as Objetivo : 'Ganho de massa',
            permite_execucao_aluno: true
          }));
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: "Erro",
          description: "Erro inesperado ao carregar dados.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [alunoId, navigate, toast, rotinaStorage.storage.configuracao]);

  // Validar formulário
  const validarForm = (): boolean => {
    const novosErros: {[key: string]: string} = {};

    if (!form.nome || form.nome.length < LIMITES.NOME_MIN) {
      novosErros.nome = `Nome deve ter pelo menos ${LIMITES.NOME_MIN} caracteres`;
    }

    if (form.duracao_semanas < LIMITES.DURACAO_MIN || form.duracao_semanas > LIMITES.DURACAO_MAX) {
      novosErros.duracao_semanas = `Duração deve ser entre ${LIMITES.DURACAO_MIN} e ${LIMITES.DURACAO_MAX} semanas`;
    }

    if (form.treinos_por_semana < LIMITES.TREINOS_MIN || form.treinos_por_semana > LIMITES.TREINOS_MAX) {
      novosErros.treinos_por_semana = `Frequência deve ser entre ${LIMITES.TREINOS_MIN} e ${LIMITES.TREINOS_MAX} treinos por semana`;
    }

    if (form.valor_total < LIMITES.VALOR_MIN) {
      novosErros.valor_total = `Valor deve ser maior ou igual a ${LIMITES.VALOR_MIN}`;
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // Salvar e avançar
  const handleProximo = async () => {
    if (!validarForm()) {
      toast({
        title: "Dados inválidos",
        description: "Por favor, corrija os erros antes de continuar.",
        variant: "destructive"
      });
      return;
    }

    setSalvando(true);
    try {
      await rotinaStorage.salvarConfiguracao(form);
      console.log('✅ Configuração salva:', form); // ← ADICIONAR
      console.log('✅ Storage após salvar:', rotinaStorage.storage); // ← ADICIONAR
      navigate(`/rotinas-criar/${alunoId}/treinos`);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração.",
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  // Voltar para lista de rotinas
  const handleVoltar = () => {
    rotinaStorage.limparStorage();
    navigate(`/alunos-rotinas/${alunoId}`);
  };

  // Limpar storage ao sair da página (voltar do navegador)
  useEffect(() => {
    const handleBeforeUnload = () => {
      rotinaStorage.limparStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [rotinaStorage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados do aluno...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Botão Voltar removido */}
          <span className="text-sm text-gray-600">Nova Rotina</span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm font-medium">Configuração</span>
        </div>
        <div className="text-sm text-gray-500">
          Etapa 1 de 4
        </div>
      </div>

      {/* Informações do aluno */}
      {aluno && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg gap-4">
              <Avatar className="h-12 w-12">
                {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                  <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                ) : (
                  <AvatarFallback style={{ backgroundColor: aluno.avatar_color }} className="text-white font-semibold">
                    {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <span>{aluno.nome_completo}</span>
                <div className="text-sm text-gray-600">{aluno.email}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            {aluno.ultimo_objetivo_rotina && (
              <p>Último objetivo: <span className="font-medium">{aluno.ultimo_objetivo_rotina}</span></p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulário de configuração */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Rotina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome da rotina */}
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome da Rotina <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Rotina de Hipertrofia João"
              className={erros.nome ? 'border-red-500' : ''}
            />
            {erros.nome && <p className="text-sm text-red-500">{erros.nome}</p>}
          </div>

          {/* Linha 1: Objetivo e Dificuldade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objetivo">
                Objetivo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.objetivo}
                onValueChange={(value) => setForm(prev => ({ ...prev, objetivo: value as Objetivo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJETIVOS.map(objetivo => (
                    <SelectItem key={objetivo} value={objetivo}>
                      {objetivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dificuldade">
                Dificuldade <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.dificuldade}
                onValueChange={(value) => setForm(prev => ({ ...prev, dificuldade: value as Dificuldade }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFICULDADES.map(dificuldade => (
                    <SelectItem key={dificuldade} value={dificuldade}>
                      {dificuldade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Duração e Frequência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracao_semanas">
                Duração (semanas) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="duracao_semanas"
                type="number"
                min={LIMITES.DURACAO_MIN}
                max={LIMITES.DURACAO_MAX}
                value={form.duracao_semanas}
                onChange={(e) => setForm(prev => ({ ...prev, duracao_semanas: parseInt(e.target.value) || 0 }))}
                className={erros.duracao_semanas ? 'border-red-500' : ''}
              />
              {erros.duracao_semanas && <p className="text-sm text-red-500">{erros.duracao_semanas}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="treinos_por_semana">
                Treinos por semana <span className="text-red-500">*</span>
              </Label>
              <Input
                id="treinos_por_semana"
                type="number"
                min={LIMITES.TREINOS_MIN}
                max={LIMITES.TREINOS_MAX}
                value={form.treinos_por_semana}
                onChange={(e) => setForm(prev => ({ ...prev, treinos_por_semana: parseInt(e.target.value) || 0 }))}
                className={erros.treinos_por_semana ? 'border-red-500' : ''}
              />
              {erros.treinos_por_semana && <p className="text-sm text-red-500">{erros.treinos_por_semana}</p>}
            </div>
          </div>

          {/* Linha 3: Valor e Forma de Pagamento */}

          {/* Data de início */}
          <div className="space-y-2">
            <Label htmlFor="data_inicio">
              Data de Início <span className="text-red-500">*</span>
            </Label>
            <Input
              id="data_inicio"
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm(prev => ({ ...prev, data_inicio: e.target.value }))}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao || ''}
              onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva os objetivos e características desta rotina..."
              rows={3}
            />
          </div>

          {/* Checkbox para execução pelo aluno - movido para logo após descrição */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="permite_execucao_aluno"
              checked={form.permite_execucao_aluno || false}
              onChange={(e) => setForm(prev => ({ ...prev, permite_execucao_aluno: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <Label htmlFor="permite_execucao_aluno" className="text-sm">
              Permitir que o aluno execute seus treinos
            </Label>
          </div>

          {/* Subtítulo Pagamentos */}
          <h4 className="text-base font-semibold text-foreground mt-6 mb-2">Pagamento</h4>

          {/* Linha Pagamentos: Valor Total e Forma de Pagamento - movida para logo abaixo do subtítulo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_total">
                Valor Total (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valor_total"
                type="number"
                min={LIMITES.VALOR_MIN}
                step="0.01"
                value={form.valor_total}
                onChange={(e) => setForm(prev => ({ ...prev, valor_total: parseFloat(e.target.value) || 0 }))}
                className={erros.valor_total ? 'border-red-500' : ''}
              />
              {erros.valor_total && <p className="text-sm text-red-500">{erros.valor_total}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="forma_pagamento">
                Forma de Pagamento <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.forma_pagamento}
                onValueChange={(value) => setForm(prev => ({ ...prev, forma_pagamento: value as FormaPagamento }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map(forma => (
                    <SelectItem key={forma} value={forma}>
                      {forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações de pagamento */}
          <div className="space-y-2">
            <Label htmlFor="observacoes_pagamento">Observações de Pagamento</Label>
            <Textarea
              id="observacoes_pagamento"
              value={form.observacoes_pagamento || ''}
              onChange={(e) => setForm(prev => ({ ...prev, observacoes_pagamento: e.target.value }))}
              placeholder="Informações adicionais sobre pagamento..."
              rows={2}
            />
          </div>

          {/* Checkbox para execução pelo aluno */}
        </CardContent>
      </Card>

      {/* Botões de navegação */}
      <div className="flex justify-end pt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleVoltar} disabled={salvando}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleProximo} disabled={salvando}>
            {salvando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                Próximo: Treinos
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RotinaConfiguracao;