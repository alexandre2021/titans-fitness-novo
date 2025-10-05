import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Instagram, Facebook, Linkedin, Globe, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatters } from '@/utils/formatters';

interface ProfessorDetalhes {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image';
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color?: string;
  telefone?: string;
  bio?: string;
  cref?: string;
  anos_experiencia?: string;
  especializacoes?: string[];
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
}

const DetalhesProfessor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [professor, setProfessor] = useState<ProfessorDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    const fetchProfessor = async () => {
      if (!id || !user) return;

      try {
        // 1. Verificar se o aluno segue o professor
        const { data: relacao, error: relacaoError } = await supabase
          .from('alunos_professores')
          .select('professor_id')
          .eq('aluno_id', user.id)
          .eq('professor_id', id)
          .single();

        if (relacaoError || !relacao) {
          throw new Error("Você não tem permissão para ver os detalhes deste professor.");
        }

        // 2. Buscar os detalhes do professor
        const { data, error } = await supabase
          .from('professores')
          .select('id, nome_completo, email, telefone, avatar_type, avatar_image_url, avatar_letter, avatar_color, bio, cref, anos_experiencia, especializacoes, instagram, facebook, linkedin, website')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProfessor(data as ProfessorDetalhes);
      } catch (error) {
        console.error("Erro ao buscar detalhes do professor:", error);
        navigate('/professores');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessor();
  }, [id, user, navigate]);

  const renderAvatar = () => {
    if (!professor) return null;
    if (professor.avatar_type === 'image' && professor.avatar_image_url) {
      // CORREÇÃO: Garante que a URL pública seja construída corretamente.
      const imageUrl = professor.avatar_image_url.startsWith('http')
        ? professor.avatar_image_url
        : supabase.storage.from('avatars').getPublicUrl(professor.avatar_image_url).data.publicUrl;

      return <AvatarImage src={imageUrl} alt={professor.nome_completo} />;
    }
    return (
      <AvatarFallback style={{ backgroundColor: professor.avatar_color }} className="text-white font-bold text-2xl">
        {professor.avatar_letter || professor.nome_completo.charAt(0).toUpperCase()}
      </AvatarFallback>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Professor não encontrado</h2>
        <p className="mt-2 text-muted-foreground">Não foi possível carregar os detalhes deste professor.</p>
        <Button onClick={() => navigate('/professores')} className="mt-6">Voltar</Button>
      </div>
    );
  }

  const formatSocialLink = (url: string) => {
    return url.startsWith('http') ? url : `https://${url}`;
  };

  // Helper para exibir "Não informado"
  const displayInfo = (value: string | undefined | null, prefix = "") => {
    return value ? `${prefix}${value}` : <span className="text-muted-foreground/80">Não informado</span>;
  };

  const hasSocialMedia = professor.instagram || professor.facebook || professor.linkedin || professor.website;

  return (
    <div className="space-y-6">
      {isDesktop && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{professor.nome_completo}</h1>
            <p className="text-muted-foreground">Detalhes do Professor</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 mb-4">{renderAvatar()}</Avatar>
          <h2 className="text-2xl font-bold">{professor.nome_completo}</h2>
          <p className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />{professor.email}</p>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Phone className="h-4 w-4" />
            {professor.telefone ? formatters.phone(professor.telefone) : 'Telefone não informado'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sobre</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{professor.bio || "Não informado."}</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Especializações</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {professor.especializacoes && professor.especializacoes.length > 0
            ? professor.especializacoes.map(esp => <Badge key={esp} variant="outline">{esp}</Badge>)
            : <p className="text-sm text-muted-foreground">Não informado.</p>
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Informações Profissionais</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">CREF:</p>
            <p className="text-sm text-muted-foreground">{displayInfo(professor.cref)}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Experiência:</p>
            <p className="text-sm text-muted-foreground">{displayInfo(professor.anos_experiencia)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Redes Sociais</CardTitle></CardHeader>
        <CardContent>
          {hasSocialMedia ? (
            <div className="flex flex-wrap gap-3">
            {professor.instagram && (
              <Button asChild variant="outline" size="sm"><a href={formatSocialLink(professor.instagram)} target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4 mr-2" />Instagram</a></Button>
            )}
            {professor.facebook && (
              <Button asChild variant="outline" size="sm"><a href={formatSocialLink(professor.facebook)} target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4 mr-2" />Facebook</a></Button>
            )}
            {professor.linkedin && (
              <Button asChild variant="outline" size="sm"><a href={formatSocialLink(professor.linkedin)} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4 mr-2" />LinkedIn</a></Button>
            )}
            {professor.website && (
              <Button asChild variant="outline" size="sm"><a href={formatSocialLink(professor.website)} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4 mr-2" />Website</a></Button>
            )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetalhesProfessor;