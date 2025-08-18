import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AlunoMobileHeader = () => {
  const { profile } = useAlunoProfile();

  const getAvatarContent = () => {
    if (profile?.avatar_type === 'image' && profile?.avatar_image_url) {
      return <AvatarImage src={profile.avatar_image_url} />;
    }
    
    const letter = profile?.avatar_letter || profile?.nome_completo?.charAt(0) || 'A';
    const color = profile?.avatar_color || '#60A5FA';
    
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <header className="bg-background border-b px-4 py-3 flex items-center justify-between md:hidden">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          {getAvatarContent()}
        </Avatar>
        <div>
          <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png" alt="Titans Fitness" className="h-12" />
          <p className="text-xs text-muted-foreground">
            {profile?.nome_completo || 'Aluno'}
          </p>
        </div>
      </div>
    </header>
  );
};

export default AlunoMobileHeader;