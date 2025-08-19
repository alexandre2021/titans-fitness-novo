// src/components/perfil/AlunoPerfilTabs.tsx

import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/hooks/useAuth";
import { EditAlunoModal } from "./EditAlunoModal";
import { PasswordChangeSection } from "./PasswordChangeSection";

interface AlunoProfileData {
  nome_completo: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  peso?: number;
  altura?: number;
  descricao_pessoal?: string;
}

interface AlunoPerfilTabsProps {
  profile: AlunoProfileData;
  onProfileUpdate?: () => void;
}

// Hook para detectar se é mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Botão de editar personalizado
const EditButton = ({ onClick }: { onClick: () => void }) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-center w-10 h-10 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Edit className="h-6 w-6" />
      </button>
    );
  }
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
    >
      <Edit className="h-4 w-4 mr-2" />
      Editar
    </Button>
  );
};

// Componente responsivo que escolhe entre Modal e Drawer
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveModal = ({ open, onOpenChange, title, children }: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export const AlunoPerfilTabs = ({ profile, onProfileUpdate }: AlunoPerfilTabsProps) => {
  const { user } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não informado";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const calculateIMC = () => {
    if (!profile.peso || !profile.altura) return "Não calculado";
    const heightInMeters = profile.altura / 100;
    const imc = profile.peso / (heightInMeters * heightInMeters);
    return imc.toFixed(1);
  };

  return (
    <Tabs defaultValue="basicas" className="space-y-6">
      <TabsList>
        <TabsTrigger value="basicas">Informações Básicas</TabsTrigger>
        <TabsTrigger value="fisicas">Informações Físicas</TabsTrigger>
        <TabsTrigger value="seguranca">Segurança</TabsTrigger>
      </TabsList>

      <TabsContent value="basicas">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Informações Básicas</CardTitle>
            <EditButton onClick={() => setEditModalOpen(true)} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="text-sm">{profile.nome_completo || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{user?.email || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-sm">{profile.telefone || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                <p className="text-sm capitalize">{profile.genero || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <p className="text-sm">{formatDate(profile.data_nascimento)}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descrição Pessoal</label>
              <p className="text-sm mt-1">
                {profile.descricao_pessoal || "Nenhuma descrição pessoal cadastrada"}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fisicas">
        <Card>
          <CardHeader>
            <CardTitle>Informações Físicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Peso</label>
                <p className="text-sm">{profile.peso ? `${profile.peso} kg` : "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Altura</label>
                <p className="text-sm">{profile.altura ? `${profile.altura} cm` : "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">IMC</label>
                <p className="text-sm">{calculateIMC()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seguranca">
        <PasswordChangeSection />
      </TabsContent>

      <ResponsiveModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Editar Informações Básicas"
      >
        <EditAlunoModal
          profile={profile}
          onSave={() => {
            onProfileUpdate?.();
            setEditModalOpen(false);
          }}
          onCancel={() => setEditModalOpen(false)}
        />
      </ResponsiveModal>
    </Tabs>
  );
};