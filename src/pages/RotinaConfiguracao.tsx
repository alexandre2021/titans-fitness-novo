// src/pages/RotinaConfiguracao.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Modal from 'react-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectScrollUpButton, SelectScrollDownButton } from '@/components/ui/select';
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
  Objetivo,        
  Dificuldade,     
  FormaPagamento,
  TreinoTemp
} from '@/types/rotina.types';



const RotinaConfiguracao = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const rotinaStorage = useRotinaStorage(alunoId!);
  const { isLoaded: isStorageLoaded } = rotinaStorage;
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [pagamentoExpandido, setPagamentoExpandido] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [form, setForm] = useState<ConfiguracaoRotina>({
    nome: '',
    objetivo: '' as Objetivo,
    dificuldade: '' as Dificuldade,
    duracao_semanas: 1, // ✅ Valor padrão 1
    treinos_por_semana: 1, // ✅ Valor padrão 1
    valor_total: 0,
    forma_pagamento: 'PIX',
    data_inicio: new Date().toISOString().split('T')[0],
    observacoes_pagamento: '',
    permite_execucao_aluno: true,
    descricao: ''
  });

  const [erros, setErros] = useState<{[key: string]: string}>({});

  // Função para normalizar valores numéricos (remove zeros à esquerda)
  const normalizarNumero = (valor: string): number => {
    const numero = parseInt(valor) || 0;
    return numero;
  };

  // Limpa erro de nome automaticamente ao digitar um valor válido
  useEffect(() => {
    if (erros.nome && form.nome && form.nome.trim().length > 0) {
      setErros(prev => {
        const { nome, ...rest } = prev;
        return rest;
      });
    }
  }, [form.nome, erros.nome]);

  // Carregar dados do aluno e dados salvos
  useEffect(() => {
    // Aguarda o storage ser carregado para evitar race condition na montagem
    if (!isStorageLoaded) return;

    // SÓ limpa cache de exercícios se for início de nova rotina (não tem configuração salva)
    if (!rotinaStorage.storage.configuracao) {
      sessionStorage.removeItem('rotina_exercicios');
    }

    let jaRedirecionou = false;

    const carregarDados = async () => {
      if (!alunoId) return;

      try {
        // ✅ CORREÇÃO: Verificar se já existe rotina ativa APENAS se não estiver editando um rascunho.
        const isEditingDraft = !!rotinaStorage.storage.draftId;

        if (!isEditingDraft) {
          const { data: rotinaAtiva } = await supabase
            .from('rotinas')
            .select('id, status')
            .eq('aluno_id', alunoId)
            .in('status', ['Ativa', 'Bloqueada']) // Usando status corretos
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
        let dataToSet;
        if (configuracaoSalva) {
          dataToSet = configuracaoSalva;
        } else {
          // Iniciar formulário em branco, sem preenchimento automático
          dataToSet = {
            nome: '',
            objetivo: '' as Objetivo,
            dificuldade: '' as Dificuldade,
            duracao_semanas: 1,
            treinos_por_semana: 1,
            valor_total: 0,
            forma_pagamento: 'PIX',
            data_inicio: new Date().toISOString().split('T')[0],
            observacoes_pagamento: '',
            descricao: '',
            permite_execucao_aluno: true
          };
        }
        setForm(dataToSet);

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
  }, [alunoId, navigate, toast, isStorageLoaded, rotinaStorage.storage.configuracao, rotinaStorage.storage.draftId]);

  // Validar formulário
  const validarForm = (): boolean => {
    const novosErros: {[key: string]: string} = {};

    if (!form.nome || form.nome.trim().length === 0) {
      novosErros.nome = `Nome da rotina é obrigatório`;
    }

    if (!form.objetivo) {
      novosErros.objetivo = "Objetivo é obrigatório";
    }

    if (!form.dificuldade) {
      novosErros.dificuldade = "Dificuldade é obrigatória";
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
    console.log('🔍 Validando formulário...');
    const isValid = validarForm();
    console.log('📋 Resultado da validação:', isValid);
    console.log('❌ Erros encontrados:', erros);
    
    if (!isValid) {
      console.log('🚨 Formulário inválido - parando execução');
      toast({
        title: "Dados inválidos",
        description: "Por favor, corrija os erros antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('✅ Formulário válido - prosseguindo');
    setSalvando(true);
    try {
      await rotinaStorage.salvarConfiguracao(form);
      console.log('✅ Configuração salva:', form);
      console.log('✅ Storage após salvar:', rotinaStorage.storage);
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
  const handleDescartar = () => {
    // Verificar se está editando um rascunho existente
    const isEditingDraft = !!rotinaStorage.storage.draftId;
    
    if (isEditingDraft) {
      // Apenas navegar de volta sem limpar - preserva o rascunho
      navigate(`/alunos-rotinas/${alunoId}`);
    } else {
      // Nova rotina - pode limpar tudo
      rotinaStorage.limparStorage();
      navigate(`/alunos-rotinas/${alunoId}`);
    }
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleSalvarRascunho = async () => {
    setSalvando(true);
    try {
      // A estratégia correta é salvar o formulário como está, respeitando os campos vazios.
      // Apenas o nome da rotina recebe um padrão se estiver vazio, para exibição na lista de rascunhos.
      const configParaSalvar = { ...form };
      
      if (!configParaSalvar.nome.trim()) {
        configParaSalvar.nome = `Rascunho de Rotina (${new Date().toLocaleDateString()})`;
      }

      // A função de salvar rascunho precisa da estrutura de treinos, mesmo que vazia.
      // Criamos os treinos iniciais baseados na frequência definida no formulário (pode ser 0).
      const treinosIniciais: TreinoTemp[] = [];
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const frequencia = configParaSalvar.treinos_por_semana || 0;
      for (let i = 0; i < frequencia; i++) {
        treinosIniciais.push({
          id: `treino_draft_${Date.now()}_${i}`,
          nome: `Treino ${nomesTreinos[i]}`,
          grupos_musculares: [],
          ordem: i + 1,
        });
      }

      const { success } = await rotinaStorage.salvarComoRascunho({ 
        configuracao: configParaSalvar,
        treinos: treinosIniciais,
        exercicios: {}
      });

      if (success) {
        rotinaStorage.limparStorage();
        navigate(`/alunos-rotinas/${alunoId}`);
      } else {
        throw new Error("Falha ao salvar rascunho.");
      }
    } catch (error) {
      toast({ title: "Erro ao salvar", description: (error as Error).message || "Não foi possível salvar o rascunho.", variant: "destructive" });
    } finally {
      setSalvando(false);
      setShowCancelDialog(false);
    }
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
    <div className="space-y-6 p-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
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
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {OBJETIVOS.map(objetivo => (
                    <SelectItem key={objetivo} value={objetivo}>
                      {objetivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.objetivo && <p className="text-sm text-red-500">{erros.objetivo}</p>}
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
                  <SelectValue placeholder="Selecione a dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  {DIFICULDADES.map(dificuldade => (
                    <SelectItem key={dificuldade} value={dificuldade}>
                      {dificuldade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.dificuldade && <p className="text-sm text-red-500">{erros.dificuldade}</p>}
            </div>
          </div>

          {/* Linha 2: Duração e Frequência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duracao_semanas">
                Duração (semanas) <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.duracao_semanas.toString()}
                onValueChange={(value) => setForm(prev => ({ ...prev, duracao_semanas: parseInt(value) }))}
              >
                <SelectTrigger id="duracao_semanas" className={erros.duracao_semanas ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectScrollUpButton>
                    <ChevronUp />
                  </SelectScrollUpButton>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map(semana => (
                    <SelectItem key={semana} value={semana.toString()}>
                      {semana} semana{semana > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                  <SelectScrollDownButton>
                    <ChevronDown />
                  </SelectScrollDownButton>
                </SelectContent>
              </Select>
              {erros.duracao_semanas && <p className="text-sm text-red-500">{erros.duracao_semanas}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="treinos_por_semana">
                Treinos por semana <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.treinos_por_semana.toString()}
                onValueChange={(value) => setForm(prev => ({ ...prev, treinos_por_semana: parseInt(value) }))}
              >
                <SelectTrigger id="treinos_por_semana" className={erros.treinos_por_semana ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }, (_, i) => i + 1).map(treino => (
                    <SelectItem key={treino} value={treino.toString()}>
                      {treino} treino{treino > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.treinos_por_semana && <p className="text-sm text-red-500">{erros.treinos_por_semana}</p>}
            </div>
          </div>

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

          {/* Seção Pagamento - Colapsável */}
          <div className="border rounded-lg overflow-hidden">
            {/* Header da seção - sempre visível */}
            <button
              type="button"
              onClick={() => setPagamentoExpandido(!pagamentoExpandido)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-foreground">Pagamento</h4>
                <span className="text-sm text-gray-500">(opcional)</span>
              </div>
              {pagamentoExpandido ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>

            {/* Conteúdo colapsável */}
            {pagamentoExpandido && (
              <div className="p-4 space-y-4 border-t bg-white">
                {/* Linha Pagamentos: Valor Total e Forma de Pagamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_total">Valor Total (R$)</Label>
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
                    <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Espaçamento para botões fixos no mobile */}
      <div className="pb-20 md:pb-6"></div>

      {/* Botões de navegação - Desktop */}
      <div className="hidden md:flex justify-end pt-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancelClick} disabled={salvando}>
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

      {/* Botões de navegação - Mobile (fixos no rodapé) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-50">
        <div className="flex justify-end gap-2 max-w-md mx-auto">
          <Button 
            variant="outline" 
            onClick={handleCancelClick}
            disabled={salvando}
            size="sm"
            className="px-3"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button 
            onClick={handleProximo} 
            disabled={salvando}
            size="sm"
            className="px-3"
          >
            {salvando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                Salvando...
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal de Cancelar - React Modal BLOQUEADA */}
<Modal
  isOpen={showCancelDialog}
  onRequestClose={() => {}} // Não permite fechar
  shouldCloseOnOverlayClick={false}
  shouldCloseOnEsc={false}
  className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
  overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
>
  <div className="flex items-center gap-2 mb-4">
    <AlertTriangle className="h-5 w-5 text-orange-500" />
    <h2 className="text-lg font-semibold">Sair da criação de rotina?</h2>
  </div>
  
  <div className="mb-6">
    <p className="text-sm text-gray-600 leading-relaxed">
      Suas alterações não salvas serão perdidas. Você também pode salvar seu progresso como um rascunho.
    </p>
  </div>
  
  <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
    <Button variant="outline" onClick={handleDescartar} disabled={salvando}>
      Descartar Alterações
    </Button>
    <Button onClick={handleSalvarRascunho} disabled={salvando}>
      {salvando ? 'Salvando...' : 'Salvar como Rascunho'}
    </Button>
  </div>
</Modal>
    </div>
  );
};

export default RotinaConfiguracao;