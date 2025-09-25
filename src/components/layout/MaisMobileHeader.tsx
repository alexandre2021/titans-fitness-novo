import React from 'react';

const MaisMobileHeader = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-center">
        <img 
          src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo-grande.png" 
          alt="Titans Fitness" 
          className="h-14 w-auto"
        />
      </div>
    </header>
  );
};

export default MaisMobileHeader;