// src/components/media/VideoRecorder.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, X } from 'lucide-react';

interface VideoRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingComplete: (blob: Blob) => void;
}

export const VideoRecorder = ({ open, onOpenChange, onRecordingComplete }: VideoRecorderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(12);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setStream(null);
    onOpenChange(false);
  }, [stream, onOpenChange]);

  // Efeito para o countdown
  useEffect(() => {
    if (!isRecording) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      stopRecording();
    }
  }, [isRecording, countdown, stopRecording]);

  // Efeito para iniciar a câmera quando o modal abre
  useEffect(() => {
    if (open) {
      const startCamera = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 360 },
              facingMode: 'environment',
            },
            audio: false,
          });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error("Erro ao acessar a câmera:", err);
          onOpenChange(false);
        }
      };
      startCamera();
    } else {
      // Limpa o stream quando o modal fecha
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [open, onOpenChange, stream]);

  const handleStartRecording = () => {
    if (!stream) return;

    recordedChunksRef.current = [];
    const options = {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 500000, // 500 kbps
    };

    mediaRecorderRef.current = new MediaRecorder(stream, options);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      onRecordingComplete(videoBlob);
      // A limpeza do stream já é feita no stopRecording
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    setCountdown(12);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Gravar Vídeo</DialogTitle>
          <DialogDescription>
            O vídeo terá no máximo 12 segundos e será gravado sem áudio.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" />
          {isRecording && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-2xl font-bold rounded-full h-16 w-16 flex items-center justify-center">
              {countdown}
            </div>
          )}
        </div>
        <div className="p-4 flex justify-center">
          {!isRecording ? (
            <Button onClick={handleStartRecording} size="lg" className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Iniciar Gravação
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" size="lg">
              Parar Gravação
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};