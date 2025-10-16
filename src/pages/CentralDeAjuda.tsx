import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import CustomSelect from "@/components/ui/CustomSelect"; // Mantido
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldAlert, Plus, GripVertical, Edit, Trash2, Loader2, Pencil, FolderPlus, Search, Filter, ImagePlus, MessageSquare, Calendar, FilePlus, Save, RefreshCw, ChevronUp, ChevronDown, History, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { TiptapToolbar } from '@/components/editor/TiptapToolbar';
import { useAuth } from "@/hooks/useAuth"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreVertical as MoreVerticalIcon } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// Paleta de cores customizada com um cinza mais claro
const customColors: (string | boolean)[] = [
  '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff',
  '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff',
  '#e5e5e5', // Cinza claro (substituído de #bbbbbb)
  '#888888', '#555555',
  false // Adiciona a opção para remover a cor
];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: article?.title || '',
    content: article?.content || '',
    category: article?.category || '',
    user_type: article?.user_type || 'ambos',
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // ✅ Adiciona margem vertical padrão aos parágrafos no editor
        paragraph: {
          HTMLAttributes: {
            class: 'my-4',
          },
        },
      }),
      Underline,
      TextStyle,
      // Permite a inserção de imagens e, por extensão, SVGs como se fossem imagens.
      Image.configure({
        inline: true, // Permite que a imagem (SVG) fique no meio do texto.
        allowBase64: true, // ✅ CORREÇÃO: Permite que imagens embutidas (data:image) sejam salvas e carregadas.
        HTMLAttributes: {
          class: 'inline-block h-[1.2em] w-auto -translate-y-px', // Estilos para o SVG se comportar como um ícone de texto.
        },
      }),
      Color,
    ],
    content: formData.content,
    onUpdate: ({ editor }) => {
      setFormData(p => ({ ...p, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        // Adicionado estilo para os títulos (h2, h3) dentro do editor
        class: 'prose max-w-none dark:prose-invert focus:outline-none p-4 border rounded-md min-h-[250px] bg-white text-base [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
      },
    },
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
    if (editor) {
      editor.chain().focus().insertContent(emojiData.emoji).run();
    }
    setShowEmojiPicker(false);
  }, [editor]);

  const handleInsertIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      // SVG do ícone de 3 pontos com fundo cinza claro e formato redondo
      const moreVerticalIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></g></svg>')}`;
      // Insere o SVG como uma imagem
      editor.chain().focus().setImage({ src: moreVerticalIconSvg, alt: 'Ícone de Menu' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertFilterIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      // SVG do ícone de filtro com fundo cinza claro e formato redondo
      const filterIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></g></svg>')}`;
      // Insere o SVG como uma imagem
      editor.chain().focus().setImage({ src: filterIconSvg, alt: 'Ícone de Filtro' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertMessageIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      // SVG do ícone de mensagem com fundo cinza claro e formato redondo
      const messageIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></g></svg>')}`;
      // Insere o SVG como uma imagem
      editor.chain().focus().setImage({ src: messageIconSvg, alt: 'Ícone de Mensagem' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertPlusIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      // SVG do ícone de mais (+) com fundo cinza claro e formato redondo
      const plusIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M5 12h14"/><path d="M12 5v14"/></g></svg>')}`;
      // Insere o SVG como uma imagem
      editor.chain().focus().setImage({ src: plusIconSvg, alt: 'Ícone de Adicionar' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertCalendarIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      // SVG do ícone de agenda (calendar) com fundo cinza claro e formato redondo
      const calendarIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></g></svg>')}`;
      // Insere o SVG como uma imagem
      editor.chain().focus().setImage({ src: calendarIconSvg, alt: 'Ícone de Agenda' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertSaveIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      // SVG do ícone de salvar (save) com fundo cinza claro e formato redondo
      const saveIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></g></svg>')}`;
      // Insere o SVG como uma imagem
      editor.chain().focus().setImage({ src: saveIconSvg, alt: 'Ícone de Salvar' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertChevronUpIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      const chevronUpIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="m18 15-6-6-6 6"/></g></svg>')}`;
      editor.chain().focus().setImage({ src: chevronUpIconSvg, alt: 'Ícone Seta para Cima' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertChevronDownIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      const chevronDownIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="m6 9 6 6 6-6"/></g></svg>')}`;
      editor.chain().focus().setImage({ src: chevronDownIconSvg, alt: 'Ícone Seta para Baixo' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertHistoryIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      const historyIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></g></svg>')}`;
      editor.chain().focus().setImage({ src: historyIconSvg, alt: 'Ícone de Histórico' }).run();
      closeModal();
    }
  }, [editor]);

  const handleInsertInfoIcon = useCallback((closeModal: () => void) => {
    if (editor) {
      const infoIconSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f3f4f6"/><g transform="translate(4, 4)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></g></svg>')}`;
      editor.chain().focus().setImage({ src: infoIconSvg, alt: 'Ícone de Informação' }).run();
      closeModal();
    }
  }, [editor]);

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
          <TiptapToolbar editor={editor} />
          <EditorContent editor={editor} className="mt-2" />
          <div className="mt-2 flex items-center gap-2">
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
            <Dialog open={isIconModalOpen} onOpenChange={setIsIconModalOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <ImagePlus className="h-4 w-4 mr-1" /> Adicionar Ícone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inserir Ícone</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 py-4">
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <MoreVerticalIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Opções</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertFilterIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><Filter className="h-5 w-5" /></div>
                    <span className="text-xs">Filtro</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertMessageIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Mensagem</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertPlusIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Adicionar</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertCalendarIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Agenda</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertSaveIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Save className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Salvar</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertChevronUpIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <ChevronUp className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Cima</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertChevronDownIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Baixo</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertHistoryIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <History className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Histórico</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleInsertInfoIcon(() => setIsIconModalOpen(false))}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Info className="h-5 w-5" />
                    </div>
                    <span className="text-xs">Info</span>
                  </Button>
                  {/* Placeholders para completar a linha de 6 */}
                  <div className="h-20"></div>
                  <div className="h-20"></div>
                </div>
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
        <AccordionTrigger className="px-3 py-2 hover:no-underline text-base">
          <div className="flex items-center gap-2 w-full">
            {isAdmin && (
              <div {...attributes} {...listeners} className="cursor-grab p-1 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                <GripVertical className="h-5 w-5" />
              </div>
            )}
            <span className="flex-1 text-left font-medium" dangerouslySetInnerHTML={{ __html: highlightText(article.title, searchTerm) }} />
            {isAdmin && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                  </DialogTrigger>
                  <DialogContent 
                    className="max-h-[85vh] overflow-y-auto w-[calc(100%-2rem)] sm:max-w-2xl rounded-md"
                    onInteractOutside={(e) => {
                      e.preventDefault();
                    }}
                  >
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
        <AccordionContent className="px-4 pt-0 pb-4">
          <div 
            className="prose max-w-none dark:prose-invert text-base [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6" 
            dangerouslySetInnerHTML={{ __html: highlightText(article.content, searchTerm) }} 
          />
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

  const handleNormalizeOrder = () => {
    if (!articles || articles.length === 0) {
      toast.info("Nenhum artigo para normalizar.");
      return;
    }

    toast.info("Normalizando a ordem dos artigos...");

    // Re-agrupa e re-ordena com base na estrutura atual
    const updates = groupedArticles.flatMap((group, categoryIndex) => 
      group.articles.map((article, articleIndex) => ({
        id: article.id,
        category_order: categoryIndex,
        article_order: articleIndex,
      }))
    );

    updateOrderMutation.mutate(updates, {
      onSuccess: () => {
        toast.success("Ordem dos artigos normalizada com sucesso!");
        // A invalidação no onSettled cuidará de recarregar os dados.
      }
    });
  };

  // ✅ CORREÇÃO: Implementação de atualização otimista para o drag & drop.
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; category_order: number; article_order: number }[]) => {
      const { error } = await supabase.rpc('update_articles_order', { updates });
      if (error) throw error;
    },
    onMutate: async (newOrderUpdates) => {
      // Cancela queries em andamento para evitar conflitos
      await queryClient.cancelQueries({ queryKey: ['knowledge_base_articles'] });
      // Salva o estado anterior para rollback em caso de erro
      const previousArticles = queryClient.getQueryData<Article[]>(['knowledge_base_articles']);

      // Atualiza o cache otimisticamente com a nova ordem
      queryClient.setQueryData<Article[]>(['knowledge_base_articles'], (old) => {
        if (!old) return [];
        const newArticles = [...old];
        newOrderUpdates.forEach(update => {
          const article = newArticles.find(a => a.id === update.id);
          if (article) {
            article.category_order = update.category_order;
            article.article_order = update.article_order;
          }
        });
        return newArticles;
      });

      return { previousArticles };
    },
    onError: (err, _newOrder, context) => {
      // Reverte para o estado anterior em caso de erro
      if (context?.previousArticles) {
        queryClient.setQueryData(['knowledge_base_articles'], context.previousArticles);
      }
      toast.error(`Erro ao salvar a ordem: ${(err as Error).message}`);
    },
    onSettled: () => {
      // Sincroniza com o banco de dados após a mutação (sucesso ou falha)
      queryClient.invalidateQueries({ queryKey: ['knowledge_base_articles'] });
    },
  });

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['knowledge_base_articles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('knowledge_base_articles').select('*');
      if (error) throw new Error(error.message);
      return (data as Article[]) || [];
    },
    // ✅ CORREÇÃO: Prevenção de refetch desnecessários
    staleTime: 10000, // Considera os dados frescos por 10 segundos
    refetchOnWindowFocus: false, // Não recarrega ao focar na janela
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
        // ✅ CORREÇÃO: Garante a ordenação correta dos artigos
        sortedGroups.forEach(group => group.articles.sort((a, b) => (a.article_order ?? 999) - (b.article_order ?? 999)));
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

          const updatedGroupsWithOrder = newOrder.map((group, index) => ({
            ...group,
            order: index,
          }));

          // ✅ CORREÇÃO: A mutação é chamada após a atualização do estado local
          const updates = newOrder.flatMap((group, index) =>
            group.articles.map(article => ({ id: article.id, category_order: index, article_order: article.article_order }))
          );
          updateOrderMutation.mutate(updates);
          return updatedGroupsWithOrder; // Retorna o estado local atualizado com a nova ordem
        });
      }
      else if (!activeIsCategory && !overIsCategory) {
        setGroupedArticles((items) => {
          const newItems = items.map(group => {
            const oldIndex = group.articles.findIndex(a => a.id === active.id);
            const newIndex = group.articles.findIndex(a => a.id === over.id);

            if (oldIndex > -1 && newIndex > -1) {
              const reorderedArticles = arrayMove(group.articles, oldIndex, newIndex);

              const updates = reorderedArticles.map((article, index) => ({
                id: article.id, 
                article_order: index,
                category_order: group.order
              }));
              // ✅ CORREÇÃO: A mutação é chamada após a atualização do estado local
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
      <div className="hidden md:flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Central de Ajuda</h1>
          <p className="text-muted-foreground">
            Encontre respostas para suas dúvidas sobre a plataforma.
          </p>
        </div>
      </div>

      <div className="relative">
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

      {/* ✅ NOVO: Botão de Normalização para Admin */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleNormalizeOrder} variant="secondary" size="sm" disabled={updateOrderMutation.isPending}>
            {updateOrderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Normalizar Ordem
          </Button>
        </div>
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
              <Button className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7" aria-label="Novo Artigo">
                <FilePlus />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Criar Novo Artigo</DialogTitle></DialogHeader>
              <ArticleForm onOpenChange={setIsNewArticleOpen} categories={groupedArticles.map(g => g.category)} />
            </DialogContent>
          </Dialog>
          {/* Botão Nova Categoria */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7" aria-label="Nova Categoria">
                <FolderPlus />
              </Button>
            </DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Criar Nova Categoria</DialogTitle></DialogHeader><NewCategoryForm onOpenChange={() => {}} /></DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default CentralDeAjuda;