// src/components/perfil/AlunoPerfilTabs.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditAlunoPessoalForm } from "./EditAlunoPessoalForm";
import { EditAlunoFisicasForm } from "./EditAlunoFisicasForm";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { AlunoParQForm } from "./AlunoParQForm";
import { AccountCancellationSection } from "./AccountCancellationSection";

interface AlunoProfileData {
  nome_completo: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  peso?: number;
  altura?: number;
  descricao_pessoal?: string;
  par_q_respostas?: Record<string, boolean | null> | null;
}

interface AlunoPerfilTabsProps {
  profile: AlunoProfileData;
  onProfileUpdate?: () => void;
}

export const AlunoPerfilTabs = ({ profile, onProfileUpdate }: AlunoPerfilTabsProps) => {
  return (
    <Tabs defaultValue="basicas" className="space-y-6">
      <TabsList>
        <TabsTrigger value="basicas">Informações Básicas</TabsTrigger>
        <TabsTrigger value="fisicas">Informações Físicas</TabsTrigger>
        <TabsTrigger value="saude">Saúde (PAR-Q)</TabsTrigger>
        <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        <TabsTrigger value="conta">Conta</TabsTrigger>
      </TabsList>

      <TabsContent value="basicas">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent>
            <EditAlunoPessoalForm profile={profile} onSave={onProfileUpdate || (() => {})} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fisicas">
        <Card>
          <CardHeader>
            <CardTitle>Informações Físicas</CardTitle>
          </CardHeader>
          <CardContent>
            <EditAlunoFisicasForm profile={profile} onSave={onProfileUpdate || (() => {})} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="saude">
        <Card>
          <CardHeader>
            <CardTitle>Questionário de Saúde (PAR-Q)</CardTitle>
          </CardHeader>
          <CardContent>
            <AlunoParQForm profile={profile} onSave={onProfileUpdate || (() => {})} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seguranca">
        <PasswordChangeSection />
      </TabsContent>

      <TabsContent value="conta">
        <AccountCancellationSection userType="aluno" />
      </TabsContent>
    </Tabs>
  );
};