// src/pages/Mais.tsx
// Esta página funciona como a tela "Mais" do aplicativo, geralmente acessada
// por um ícone na barra de navegação principal (especialmente no mobile).
// Ela serve para agrupar links de navegação adicionais que não cabem no menu principal.
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ChevronRight, BookCopy, SquarePen, Home, LifeBuoy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Mais = () => {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineUserType = async () => {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }
      // Lógica robusta para garantir que o tipo de usuário seja sempre encontrado
      let type = user.user_metadata?.user_type;
      if (!type) {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
          type = profile?.user_type;
        } catch (error) {
          console.error("Erro ao buscar perfil de usuário na página 'Mais':", error);
        }
      }
      setUserType(type || null);
      setLoading(false);
    };
    determineUserType();
  }, [user, authLoading]);

  const baseProfessorLinks = [
    { href: "/meus-modelos", label: "Meus Modelos", icon: BookCopy },
    { href: "/app/ajuda", label: "Central de Ajuda", icon: LifeBuoy },
    { href: "/", label: "Home", icon: Home },
  ];

  if (user?.email === 'contato@titans.fitness') {
    baseProfessorLinks.push({ href: "/meus-posts", label: "Meus Posts", icon: SquarePen });
  }
  
  const professorLinks = baseProfessorLinks;

  const alunoLinks = [
    { href: "/app/ajuda", label: "Central de Ajuda", icon: LifeBuoy },
    { href: "/", label: "Home", icon: Home },
  ];

  const links = userType === 'professor' ? professorLinks : userType === 'aluno' ? alunoLinks : [];

  if (loading || authLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-card border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <Link key={link.href} to={link.href} className="flex items-center justify-between p-4 bg-card border rounded-lg hover:bg-muted transition-colors">
          <div className="flex items-center gap-4"><link.icon className="h-5 w-5 text-muted-foreground" /> <span className="font-medium">{link.label}</span></div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
};

export default Mais;