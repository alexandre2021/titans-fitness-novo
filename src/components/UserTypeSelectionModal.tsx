import Modal from 'react-modal';
import { Button } from "@/components/ui/button";
import { User, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserTypeSelectionModalProps {
  open: boolean;
  onSelectType: (type: 'aluno' | 'professor') => void;
}

export const UserTypeSelectionModal = ({ open, onSelectType }: UserTypeSelectionModalProps) => {
  return (
    <Modal
      isOpen={open}
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none shadow-2xl"
      overlayClassName="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
      ariaHideApp={false}
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Complete seu Cadastro</h2>
        <p className="text-muted-foreground mb-6">
          Para finalizar, que tipo de conta você deseja criar?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Professor */}
          <Card
            onClick={() => onSelectType('professor')}
            className="border-border hover:border-primary transition-colors cursor-pointer group text-center"
          >
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">Sou Professor</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">Para gerenciar alunos e criar treinos.</p></CardContent>
          </Card>

          {/* Card Aluno */}
          <Card
            onClick={() => onSelectType('aluno')}
            className="border-border hover:border-secondary transition-colors cursor-pointer group text-center"
          >
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-xl text-foreground">Sou Aluno</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">Para executar treinos e acompanhar meu progresso.</p></CardContent>
          </Card>
        </div>
      </div>
    </Modal>
  );
};