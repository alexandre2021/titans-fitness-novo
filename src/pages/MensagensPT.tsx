import { useMediaQuery } from "@/hooks/use-media-query";

const MensagensPT = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="space-y-6 p-6">
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Mensagens</h1>
          <p className="text-muted-foreground">Comunicação com seus alunos</p>
        </div>
      )}

      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Sistema de mensagens em desenvolvimento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MensagensPT;