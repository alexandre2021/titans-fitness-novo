import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Circle } from 'lucide-react';
import { toast as sonnerToast } from "sonner";
import Modal from 'react-modal';

interface VideoRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingComplete: (files: { videoBlob: Blob }) => void;
}

export function VideoRecorder({ open, onOpenChange, onRecordingComplete }: VideoRecorderProps) {
  const toast = sonnerToast;
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(12);

  // --- LÓGICA DE PARADA DA GRAVAÇÃO ---
  const stopRecording = useCallback(() => {
    // A lógica de stop é movida para dentro do onstop do recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // O stream será parado no onstop do recorder, após processamento
    setIsRecording(false);
    setCountdown(12);
  }, []);

  // --- LÓGICA DE INÍCIO DA GRAVAÇÃO ---
  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Erro", { description: "Seu navegador não suporta gravação de vídeo." });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 360 },
          height: { ideal: 640 },
          aspectRatio: { ideal: 9/16 }
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Limpa chunks anteriores
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 500000, // 500 kbps
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`📦 [VideoRecorder] Chunk recebido: ${event.data.size} bytes`);
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log(`🛑 [VideoRecorder] Gravação parada. Total de chunks: ${recordedChunksRef.current.length}`);

        // Para todas as tracks do stream (limpeza da câmera)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log(`🎬 [VideoRecorder] VideoBlob criado: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`);

        // Retorna apenas o vídeo (sem thumbnail)
        onRecordingComplete({ videoBlob });
        onOpenChange(false);
      };

      console.log(`▶️ [VideoRecorder] Iniciando gravação...`);
      recorder.start(1000); // Captura dados a cada 1 segundo
      setIsRecording(true);

    } catch (err) {
      console.error("Erro ao iniciar câmera:", err);
      toast.error("Erro de Câmera", { description: "Não foi possível acessar a câmera. Verifique as permissões." });
      onOpenChange(false);
    }
  }, [toast, onRecordingComplete, onOpenChange]);

  // Limpeza ao fechar o modal ou limite de tempo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // AQUI CHAMAMOS stopRecording, que aciona o recorder.onstop
            stopRecording(); 
            return 12;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, stopRecording]);

  useEffect(() => {
    if (open) {
      // Quando o modal abrir, inicia gravação automaticamente
      console.log('🔴 [VideoRecorder] Modal aberto, iniciando gravação...');
      startRecording();
    } else {
      // Limpeza quando o modal fecha
      console.log('🔴 [VideoRecorder] Modal fechado, limpando recursos...');
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop());
         streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      setIsRecording(false);
      setCountdown(12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  return (
    <Modal
      isOpen={open}
      onRequestClose={() => onOpenChange(false)}
      shouldCloseOnOverlayClick={false} 
      shouldCloseOnEsc={true}
      className="h-full w-full bg-black flex flex-col outline-none"
      overlayClassName="fixed inset-0 z-50"
    >
        <div className="text-left text-white relative p-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold">Gravador de Vídeo</h2>
          <p className="text-sm text-gray-300 mt-1">📱 Mantenha o celular em pé (vertical)</p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 h-8 w-8 rounded-full text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 relative flex items-center justify-center aspect-video bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-contain" />

          <div className="absolute inset-0 flex flex-col justify-between items-center p-4">
            {isRecording && (
              <div className="bg-black/50 text-white text-2xl font-mono rounded-full px-4 py-2">
                00:{countdown.toString().padStart(2, '0')}
              </div>
            )}
            
            <div className="flex-1"></div>

            {!isRecording ? (
              <Button onClick={startRecording} size="lg" className="rounded-full bg-red-600 hover:bg-red-700 text-white">
                <Camera className="h-6 w-6 mr-2" />
                Iniciar Gravação
              </Button>
            ) : (
              <Button onClick={stopRecording} size="lg" variant="outline" className="rounded-full bg-white/20 text-white border-white hover:bg-white/30 hover:text-white">
                <Circle className="h-6 w-6 mr-2 fill-red-600 text-red-600" />
                Parar Gravação
              </Button>
            )}
          </div>
        </div>
    </Modal>
  );
}