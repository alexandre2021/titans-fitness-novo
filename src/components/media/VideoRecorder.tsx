import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Circle } from 'lucide-react';
import { toast as sonnerToast } from "sonner";
import Modal from 'react-modal';

interface VideoRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingComplete: (videoBlob: Blob) => void;
}

export function VideoRecorder({ open, onOpenChange, onRecordingComplete }: VideoRecorderProps) {
  const toast = sonnerToast;
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(12);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setCountdown(12);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Erro", { description: "Seu navegador não suporta gravação de vídeo." });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const recordedChunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 500000, // 500 kbps para compressão
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
        onRecordingComplete(videoBlob);
        stopRecording();
      };

      recorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error("Erro ao iniciar câmera:", err);
      toast.error("Erro de Câmera", { description: "Não foi possível acessar a câmera. Verifique as permissões." });
      onOpenChange(false);
    }
  }, [toast, onRecordingComplete, onOpenChange, stopRecording]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            stopRecording();
            return 12;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, stopRecording]);

  // Limpeza ao fechar o modal
  useEffect(() => {
    if (!open) {
      stopRecording();
    }
  }, [open, stopRecording]);

  return (
    <Modal
      isOpen={open}
      onRequestClose={() => onOpenChange(false)}
      shouldCloseOnOverlayClick={false} // Evita fechar ao clicar fora
      shouldCloseOnEsc={true}
      className="h-full w-full bg-black flex flex-col outline-none"
      overlayClassName="fixed inset-0 z-50"
    >
        <div className="text-left text-white relative p-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold">Gravador de Vídeo</h2>
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