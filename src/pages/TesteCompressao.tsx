import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { compressVideo } from '@/lib/imageUtils';

export default function TesteCompressao() {
  const [resultado, setResultado] = useState<string>('');
  const [processando, setProcessando] = useState(false);

  const handleTesteCompressao = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/webm,video/quicktime';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      console.log('🔴 TESTE: Arquivo selecionado:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      setResultado(`Arquivo original: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      setProcessando(true);

      try {
        console.log('🔴 TESTE: Chamando compressVideo...');
        const comprimido = await compressVideo(file);
        console.log('🔴 TESTE: Vídeo comprimido:', comprimido.name, `(${(comprimido.size / 1024 / 1024).toFixed(2)}MB)`);

        setResultado(`
Original: ${file.name} - ${(file.size / 1024 / 1024).toFixed(2)}MB
Comprimido: ${comprimido.name} - ${(comprimido.size / 1024 / 1024).toFixed(2)}MB
Economia: ${((1 - comprimido.size / file.size) * 100).toFixed(1)}%
        `);
      } catch (error) {
        console.error('🔴 TESTE: Erro na compressão:', error);
        setResultado(`ERRO: ${(error as Error).message}`);
      } finally {
        setProcessando(false);
      }
    };

    input.click();
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Compressão de Vídeo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTesteCompressao} disabled={processando}>
            {processando ? 'Processando...' : 'Selecionar Vídeo para Teste'}
          </Button>

          {resultado && (
            <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
              {resultado}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
