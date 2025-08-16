import { useState } from "react";
import { Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditPessoalModal } from "./EditPessoalModal";
import { EditProfissionalModal } from "./EditProfissionalModal";
import { EditRedesSociaisModal } from "./EditRedesSociaisModal";
import { PasswordChangeSection } from "./PasswordChangeSection";

interface ProfileData {
  nome_completo: string;
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
  const [editPessoalOpen, setEditPessoalOpen] = useState(false);
  const [editProfissionalOpen, setEditProfissionalOpen] = useState(false);
  const [editRedesOpen, setEditRedesOpen] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não informado";
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Tabs defaultValue="pessoal" className="space-y-6">
      <TabsList className="bg-muted border border-border/30">
        <TabsTrigger value="pessoal" className="data-[state=inactive]:bg-background/40 data-[state=inactive]:text-muted-foreground">
          Pessoal
        </TabsTrigger>
        <TabsTrigger value="profissional" className="data-[state=inactive]:bg-background/40 data-[state=inactive]:text-muted-foreground">
          Profissional
        </TabsTrigger>
        <TabsTrigger value="redes" className="data-[state=inactive]:bg-background/40 data-[state=inactive]:text-muted-foreground">
          Redes Sociais
        </TabsTrigger>
        <TabsTrigger value="seguranca" className="data-[state=inactive]:bg-background/40 data-[state=inactive]:text-muted-foreground">
          Segurança
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pessoal">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informações Pessoais</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditPessoalOpen(true)}
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
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-sm">{profile.telefone || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <p className="text-sm">{formatDate(profile.data_nascimento)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                <p className="text-sm">{profile.genero || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="profissional">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Informações Profissionais</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditProfissionalOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CREF</label>
                <p className="text-sm">{profile.cref || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Anos de Experiência</label>
                <p className="text-sm">{profile.anos_experiencia || "Não informado"}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Especializações</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.especializacoes?.length ? (
                  profile.especializacoes.map((esp, index) => (
                    <Badge key={index} variant="secondary">{esp}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma especialização cadastrada</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Biografia</label>
              <p className="text-sm mt-1">{profile.bio || "Nenhuma biografia cadastrada"}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="redes">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Redes Sociais</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditRedesOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Instagram</label>
                <p className="text-sm">{profile.instagram || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Facebook</label>
                <p className="text-sm">{profile.facebook || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">LinkedIn</label>
                <p className="text-sm">{profile.linkedin || "Não informado"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Website</label>
                <p className="text-sm">{profile.website || "Não informado"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="seguranca">
        <PasswordChangeSection />
      </TabsContent>

      <EditPessoalModal
        open={editPessoalOpen}
        onOpenChange={setEditPessoalOpen}
        profile={profile}
        onSave={onProfileUpdate}
      />

      <EditProfissionalModal
        open={editProfissionalOpen}
        onOpenChange={setEditProfissionalOpen}
        profile={profile}
        onSave={onProfileUpdate}
      />

      <EditRedesSociaisModal
        open={editRedesOpen}
        onOpenChange={setEditRedesOpen}
        profile={profile}
        onSave={onProfileUpdate}
      />
    </Tabs>
  );
};