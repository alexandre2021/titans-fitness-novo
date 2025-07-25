import { useState } from "react";
import { Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basicas">Informações Básicas</TabsTrigger>
        <TabsTrigger value="fisicas">Informações Físicas</TabsTrigger>
        <TabsTrigger value="seguranca">Segurança</TabsTrigger>
      </TabsList>

      <TabsContent value="basicas">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informações Básicas</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
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

      <EditAlunoModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        profile={profile}
        onSave={onProfileUpdate || (() => {})}
      />
    </Tabs>
  );
};