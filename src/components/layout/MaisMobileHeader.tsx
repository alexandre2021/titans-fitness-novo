import React from 'react';

const MaisMobileHeader = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 border-b shadow-sm bg-gray-50/80 backdrop-blur-sm">
      <div className="container flex h-20 items-center justify-center">
        <img 
          src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png" 
          alt="Titans Fitness" 
          className="h-14 w-auto"
        />
      </div>
    </header>
  );
};

export default MaisMobileHeader;