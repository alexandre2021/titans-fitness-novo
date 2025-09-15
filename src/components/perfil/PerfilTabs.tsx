// src/components/perfil/PerfilTabs.tsx (versão para Personal Trainers)

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    </Tabs>
  );
};