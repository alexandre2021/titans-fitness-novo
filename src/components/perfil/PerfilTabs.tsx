// src/components/perfil/PerfilTabs.tsx (versão para Personal Trainers)

import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { EditPessoalForm } from "./EditPessoalForm";
import { EditProfissionalForm } from "./EditProfissionalForm";
import { EditRedesSociaisForm } from "./EditRedesSociaisForm";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { AccountCancellationSection } from "./AccountCancellationSection";

interface ProfileData {
  nome_completo?: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  cref?: string;
  anos_experiencia?: string;
  especializacoes?: string[];
  bio?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
}

interface PerfilTabsProps {
  profile: ProfileData;
  onProfileUpdate: () => void;
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

export const PerfilTabs = ({ profile, onProfileUpdate }: PerfilTabsProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não informado";
    // Corrigido para evitar problemas de fuso horário
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Tabs defaultValue="pessoal" className="space-y-6">
      <TabsList>
        <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
        <TabsTrigger value="profissional">Profissional</TabsTrigger>
        <TabsTrigger value="redes">Redes Sociais</TabsTrigger>
        <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        <TabsTrigger value="conta">Conta</TabsTrigger>
      </TabsList>

      <TabsContent value="pessoal">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <EditPessoalForm profile={profile} onSave={onProfileUpdate} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="profissional">
        <Card>
          <CardHeader>
            <CardTitle>Informações Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            <EditProfissionalForm profile={profile} onSave={onProfileUpdate} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="redes">
        <Card>
          <CardHeader>
            <CardTitle>Redes Sociais</CardTitle>
          </CardHeader>
          <CardContent>
            <EditRedesSociaisForm profile={profile} onSave={onProfileUpdate} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seguranca">
        <PasswordChangeSection />
      </TabsContent>

      <TabsContent value="conta">
        <AccountCancellationSection userType="personal_trainer" />
      </TabsContent>

      {/* Modais Responsivos */}
    </Tabs>
  );
};