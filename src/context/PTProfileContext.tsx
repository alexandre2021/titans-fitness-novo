import React, { createContext, ReactNode } from 'react';
import { usePTProfile } from '@/hooks/usePTProfile';
import { Tables } from '@/integrations/supabase/types';

type PTProfile = Tables<"personal_trainers">;

interface PTProfileContextType {
  profile: PTProfile | null;
  loading: boolean;
  refetchProfile: () => void;
}

export const PTProfileContext = createContext<PTProfileContextType | undefined>(undefined);

interface PTProfileProviderProps {
  children: ReactNode;
}

export const PTProfileProvider = ({ children }: PTProfileProviderProps) => {
  const { profile, loading, refetchProfile } = usePTProfile();

  return (
    <PTProfileContext.Provider value={{ profile, loading, refetchProfile }}>
      {children}
    </PTProfileContext.Provider>
  );
};