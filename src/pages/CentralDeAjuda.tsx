import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldAlert, Plus, GripVertical, Edit, Trash2, Loader2, Pencil, FolderPlus, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from "@/hooks/useAuth"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

type Article = {
  id: string;
  title: string;
  content: string;
  category: string;  
  user_type: 'ambos' | 'aluno' | 'professor';
  category_order: number;
  article_order: number;
};

type GroupedArticles = {
  category: string;
  order: number;
  articles: Article[];
};

// --- Funções de Destaque ---
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const escapedQuery = escapeRegExp(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, `<mark class="bg-yellow-200 px-1 rounded">$1</mark>`);
};

// --- Componente do Formulário de Edição/Criação ---
const ArticleForm = ({ article, onOpenChange, categories }: { article?: Article | null, onOpenChange: (open: boolean) => void, categories: string[] }) => {
  const queryClient = useQueryClient();
  const quillRef = useRef<ReactQuill>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [formData, setFormData] = useState({
    title: article?.title || '',
    content: article?.content || '',
    category: article?.category || '',
    user_type: article?.user_type || 'ambos',
  });

  const mutation = useMutation({
    mutationFn: async (newArticle: Omit<Article, 'id' | 'category_order' | 'article_order' > & { id?: string; }) => {
      const dataToSave = {
        ...newArticle,
      };
      if (article?.id) {
        const { error } = await supabase.from('knowledge_base_articles').update(dataToSave).eq('id', article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('knowledge_base_articles').insert(dataToSave);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Artigo ${article?.id ? 'atualizado' : 'criado'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar artigo: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleEmojiSelect = useCallback((emojiData: EmojiClickData) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, emojiData.emoji);
      quill.setSelection(range.index + emojiData.emoji.length, 0);
    }
    setShowEmojiPicker(false);
  }, []);

  const quillModules = {
    toolbar: [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'clean'],
    ],
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Título</Label>
        <Input id="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="category">Categoria</Label>
        <CustomSelect
          inputId="category"
          value={formData.category ? { value: formData.category, label: formData.category } : null}
          onChange={(option) => setFormData(p => ({ ...p, category: option ? option.value : '' }))}
          options={categories.map(cat => ({ value: cat, label: cat }))}
          isCreatable={true}
          placeholder="Selecione ou crie uma categoria"
          formatCreateLabel={(inputValue) => `Criar nova categoria: "${inputValue}"`}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo</Label>
        <div className="relative">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={formData.content}
            onChange={content => setFormData(p => ({ ...p, content }))}
            readOnly={mutation.isPending}
            modules={quillModules}
            formats={[
              'header',
              'bold', 'italic', 'underline',
              'list', 'bullet',
              'link',
            ]}
            className="bg-white [&&>.ql-container_.ql-editor]:min-h-[250px]"
          />
          <div className="mt-2">
            <Dialog open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  😀 Adicionar Emoji
                </Button>
              </DialogTrigger>
              <DialogContent className="w-auto p-0 border-0">
                <EmojiPicker onEmojiClick={handleEmojiSelect} lazyLoadEmojis />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="user_type">Visível para</Label>
        <CustomSelect
          inputId="user_type"
          value={{ value: formData.user_type, label: formData.user_type.charAt(0).toUpperCase() + formData.user_type.slice(1) }}
          onChange={(opt) => setFormData(p => ({ ...p, user_type: opt?.value as 'ambos' | 'aluno' | 'professor' }))}
          options={[{ value: 'ambos', label: 'Ambos' }, { value: 'aluno', label: 'Aluno' }, { value: 'professor', label: 'Professor' }]}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar Artigo
      </Button>
    </form>
  );
};

// --- Componente para um Artigo Arrastável ---
const SortableArticleItem = ({ article, allCategories, isAdmin, searchTerm }: { article: Article, allCategories: string[], isAdmin: boolean, searchTerm: string }) => {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: article.id, disabled: !isAdmin });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isFormOpen, setIsFormOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const { error } = await supabase.from('knowledge_base_articles').delete().eq('id', articleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artigo excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir artigo: ${error.message}`);
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o artigo "${article.title}"?`)) {
      deleteMutation.mutate(article.id);
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={article.id} className="border rounded-md bg-background">
        <AccordionTrigger className="px-3 py-2 hover:no-underline">
          <div className="flex items-center gap-2 w-full">
            {isAdmin && (
              <div {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            <span className="flex-1 truncate text-left" dangerouslySetInnerHTML={{ __html: highlightText(article.title, searchTerm) }} />
            {isAdmin && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto w-[calc(100%-2rem)] sm:max-w-2xl rounded-md">
                    <DialogHeader>
                      <DialogTitle>Editar Artigo</DialogTitle>
                    </DialogHeader>
                    <ArticleForm article={article} onOpenChange={setIsFormOpen} categories={allCategories} />
                  </DialogContent>
                </Dialog>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pt-0 pb-4 ml-10">
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: highlightText(article.content, searchTerm) }} />
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

// --- Componente para uma Categoria Arrastável ---
const SortableCategorySection = ({ category, articles, allCategories, isAdmin, searchTerm }: GroupedArticles & { allCategories: string[], isAdmin: boolean, searchTerm: string }) => {
  const queryClient = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category, disabled: !isAdmin });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState(category);

  const updateCategoryNameMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (!newName || newName.trim() === '') throw new Error("O nome da categoria não pode ser vazio.");
      const { error } = await supabase
        .from('knowledge_base_articles')
        .update({ category: newName.trim() })
        .eq('category', oldName);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria renomeada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao renomear categoria: ${error.message}`);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .delete()
        .eq('category', categoryName);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria e todos os seus artigos foram excluídos!");
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir categoria: ${error.message}`);
    }
  });

  const handleUpdateCategory = () => {
    if (newCategoryName.trim() !== category) {
      updateCategoryNameMutation.mutate({ oldName: category, newName: newCategoryName });
    } else {
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteCategory = () => {
    deleteCategoryMutation.mutate(category);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={category} className="border rounded-lg bg-card mb-4">
        <AccordionTrigger className="text-xl font-semibold px-6 py-4 hover:no-underline text-left">
          <div className="flex items-center gap-3 w-full">
            {isAdmin && (
              <div {...attributes} {...listeners} className="cursor-grab p-2 -ml-2 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            <span className="flex-1">{category}</span>
            {isAdmin && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Renomear Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Você está renomeando a categoria "<strong>{category}</strong>". Isso atualizará todos os artigos dentro dela.</p>
                      <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleUpdateCategory} disabled={updateCategoryNameMutation.isPending}>
                          {updateCategoryNameMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Excluir Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Tem certeza que deseja excluir a categoria "<strong>{category}</strong>"?</p>
                      <p className="text-destructive font-semibold">Atenção: Todos os {articles.length} artigos dentro desta categoria serão permanentemente excluídos. Esta ação não pode ser desfeita.</p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteCategory} disabled={deleteCategoryMutation.isPending}>
                          {deleteCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pt-0 pb-4">
          <div className="space-y-2">
            <SortableContext items={articles.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" className="w-full space-y-2" defaultValue={searchTerm ? articles.map(a => a.id) : []}>
                {articles.map(article => <SortableArticleItem key={article.id} article={article} allCategories={allCategories} isAdmin={isAdmin} searchTerm={searchTerm} />)}
              </Accordion>
            </SortableContext>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

// --- Componente para Criar Nova Categoria ---
const NewCategoryForm = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState('');

  const mutation = useMutation({
    mutationFn: async (categoryName: string) => {
      if (!categoryName || categoryName.trim() === '') throw new Error("O nome da categoria não pode ser vazio.");
      const { error } = await supabase.from('knowledge_base_articles').insert({
        title: 'Novo Artigo Placeholder',
        content: 'Edite este artigo.',
        category: categoryName.trim(),
        user_type: 'ambos',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nova categoria criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    }
  });

  return (
    <div className="space-y-4">
      <p>Digite o nome da nova categoria. Um artigo de exemplo será criado dentro dela.</p>
      <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome da Categoria" />
      <Button onClick={() => mutation.mutate(newCategoryName)} disabled={mutation.isPending || !newCategoryName.trim()}>
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Categoria
      </Button>
    </div>
  );
};

const CentralDeAjuda = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.email === 'contato@titans.fitness';

  const [isNewArticleOpen, setIsNewArticleOpen] = useState(false);
  const [groupedArticles, setGroupedArticles] = useState<GroupedArticles[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'todos' | 'aluno' | 'professor'>(
    isAdmin ? 'todos' : user?.user_metadata?.user_type || 'professor'
  );

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; category_order: number; article_order: number }[]) => {
      // Chama a nova função RPC do Supabase para atualizar a ordem
      const { error } = await supabase.rpc('update_articles_order', { updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar a ordem: ${error.message}`);
    }
  });

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['knowledge_base_articles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('knowledge_base_articles').select('*');
      if (error) throw new Error(error.message);
      return (data as Article[]) || [];
    },
  });

  useEffect(() => {
    if (articles) {
      const userTypeFilteredArticles = articles.filter(article => {
        if (isAdmin && userTypeFilter === 'todos') {
          return true;
        }
        if (userTypeFilter === 'aluno') {
          return article.user_type === 'aluno' || article.user_type === 'ambos';
        }
        if (userTypeFilter === 'professor') {
          return article.user_type === 'professor' || article.user_type === 'ambos';
        }
        return false;
      });
      
      if (searchTerm.trim()) {
        // Filtra os artigos que correspondem ao termo de busca no título ou conteúdo.
        const filteredArticles = userTypeFilteredArticles.filter(article =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.content.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Agrupa apenas os artigos filtrados.
        const grouped = filteredArticles.reduce((acc, article) => {
          const category = article.category || 'Sem Categoria';
          if (!acc[category]) {
            acc[category] = { category, order: article.category_order ?? 0, articles: [] };
          }
          acc[category].articles.push(article);
          return acc;
        }, {} as Record<string, GroupedArticles>);

        const sortedGroups = Object.values(grouped).sort((a, b) => a.order - b.order);
        setGroupedArticles(sortedGroups);
      } else {
        // Lógica original quando não há busca
        const grouped = userTypeFilteredArticles.reduce((acc, article) => {
          const category = article.category || 'Sem Categoria';
          if (!acc[category]) {
            acc[category] = { category, order: article.category_order ?? 0, articles: [] };
          }
          acc[category].articles.push(article);
          return acc;
        }, {} as Record<string, GroupedArticles>);

        const sortedGroups = Object.values(grouped).sort((a, b) => a.order - b.order);
        setGroupedArticles(sortedGroups);
      }
    }
  }, [articles, userTypeFilter, isAdmin, user?.user_metadata?.user_type, searchTerm]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isAdmin) return; // <-- ADICIONADO: Bloqueia a função para não-admins

    const { active, over } = event;
    if (!over) return;

    const activeIsCategory = groupedArticles.some(g => g.category === active.id);
    const overIsCategory = groupedArticles.some(g => g.category === over.id);

    if (active.id !== over.id) {
      if (activeIsCategory && overIsCategory) {
        setGroupedArticles((items) => {
          const oldIndex = items.findIndex(g => g.category === active.id);
          const newIndex = items.findIndex(g => g.category === over.id);
          const newOrder = arrayMove(items, oldIndex, newIndex);
          
          const updates = newOrder.flatMap((group, index) =>
            group.articles.map(article => ({ id: article.id, category_order: index, article_order: article.article_order }))
          );
          updateOrderMutation.mutate(updates);
          return newOrder;
        });
      }
      else if (!activeIsCategory && !overIsCategory) {
        setGroupedArticles((items) => {
          const newItems = items.map(group => {
            const oldIndex = group.articles.findIndex(a => a.id === active.id);
            const newIndex = group.articles.findIndex(a => a.id === over.id);

            if (oldIndex > -1 && newIndex > -1) {
              const reorderedArticles = arrayMove(group.articles, oldIndex, newIndex);
              const updates = reorderedArticles.map((article, index) => ({ id: article.id, article_order: index, category_order: group.order }));
              updateOrderMutation.mutate(updates);
              return { ...group, articles: reorderedArticles };
            }
            return group;
          });
          return newItems;
        });
      }
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6 pb-40 md:pb-24">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Central de Ajuda</h1>
          <p className="text-muted-foreground">
            Encontre respostas para suas dúvidas sobre a plataforma.
          </p>
        </div>
      </div>

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Busque por artigos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Seletor para Administrador */}
      {isAdmin && (
        <Tabs value={userTypeFilter} onValueChange={(value) => setUserTypeFilter(value as 'todos' | 'aluno' | 'professor')} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="professor">Para Professores</TabsTrigger>
            <TabsTrigger value="aluno">Para Alunos</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Seletor para usuários não logados */}
      {!user && !isAdmin && (
        <Tabs value={userTypeFilter} onValueChange={(value) => setUserTypeFilter(value as 'aluno' | 'professor')} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="professor">Para Professores</TabsTrigger>
            <TabsTrigger value="aluno">Para Alunos</TabsTrigger>
          </TabsList>
        </Tabs>
      )}


      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Accordion type="multiple" className="w-full space-y-4">
          <SortableContext items={groupedArticles.map(g => g.category)} strategy={verticalListSortingStrategy}>
            {groupedArticles.map((group) => (
              <SortableCategorySection 
                key={group.category} 
                {...group} 
                allCategories={groupedArticles.map(g => g.category)}
                isAdmin={isAdmin}
                searchTerm={searchTerm}
              />
            ))}
          </SortableContext>
        </Accordion>
      </DndContext>

      {/* Botões Flutuantes para Admin */}
      {isAdmin && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-row-reverse items-center gap-3">
          {/* Botão Novo Artigo */}
          <Dialog open={isNewArticleOpen} onOpenChange={setIsNewArticleOpen}>
            <DialogTrigger asChild>
              <div>
                <Button className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8" aria-label="Artigo"><Plus /></Button>
                <Button className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6" size="lg"><Plus /> Artigo</Button>
              </div>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar Novo Artigo</DialogTitle></DialogHeader>
              <ArticleForm onOpenChange={setIsNewArticleOpen} categories={groupedArticles.map(g => g.category)} />
            </DialogContent>
          </Dialog>

          {/* Botão Nova Categoria */}
          <Dialog>
            <DialogTrigger asChild>
              <div>
                <Button variant="outline" className="md:hidden rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7" aria-label="Categoria"><FolderPlus /></Button>
                <Button variant="outline" className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-5" size="lg"><FolderPlus /> Categoria</Button>
              </div>
            </DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Criar Nova Categoria</DialogTitle></DialogHeader><NewCategoryForm onOpenChange={() => {}} /></DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default CentralDeAjuda;