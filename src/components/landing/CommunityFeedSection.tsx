import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle } from 'lucide-react';

// Dados de exemplo para os posts
const mockPosts = [
  {
    id: '1',
    title: '5 Dicas para Melhorar sua Postura no Dia a Dia',
    snippet: 'Manter uma boa postura é essencial para evitar dores e lesões. Descubra exercícios simples para fortalecer seu core e alinhar sua coluna, melhorando sua qualidade de vida.',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=870&auto=format&fit=crop',
    author: { name: 'Carlos Silva', avatarLetter: 'C', avatarColor: '#3b82f6' },
    likes: 128,
    comments: 12,
  },
  {
    id: '2',
    title: 'Receita de Shake Pós-Treino Rico em Proteínas',
    snippet: 'Quer uma recuperação mais rápida e eficaz? Experimente este shake delicioso e nutritivo: 1 scoop de whey, 1 banana congelada, e pasta de amendoim.',
    imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=874&auto=format&fit=crop',
    author: { name: 'Juliana Costa', avatarLetter: 'J', avatarColor: '#8b5cf6' },
    likes: 256,
    comments: 28,
  },
  {
    id: '3',
    title: 'A Importância do Aquecimento Antes de Qualquer Atividade',
    snippet: 'Muitos pulam o aquecimento, mas ele é crucial para preparar o corpo para o esforço e prevenir lesões. Dedique de 5 a 10 minutos para exercícios leves antes de começar.',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=870&auto=format&fit=crop',
    author: { name: 'Fernando Lima', avatarLetter: 'F', avatarColor: '#10b981' },
    likes: 98,
    comments: 7,
  },
];

const CommunityFeedSection = () => {
  return (
    <section className="py-12 md:py-20 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dicas da nossa Comunidade</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Conteúdo criado por nossos melhores professores para te ajudar a alcançar seus objetivos.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col">
              <CardHeader className="p-0">
                <img src={post.imageUrl} alt={post.title} className="w-full h-48 object-cover" />
              </CardHeader>
              <CardContent className="p-6 flex-grow">
                <CardTitle className="text-xl font-semibold mb-2 line-clamp-2">{post.title}</CardTitle>
                <p className="text-muted-foreground line-clamp-3">{post.snippet}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center p-6 pt-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback style={{ backgroundColor: post.author.avatarColor }} className="text-white text-xs">{post.author.avatarLetter}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium">{post.author.name}</span>
                </div>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Heart className="h-4 w-4" /><span className="text-xs font-mono">{post.likes}</span></div>
                  <div className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /><span className="text-xs font-mono">{post.comments}</span></div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunityFeedSection;