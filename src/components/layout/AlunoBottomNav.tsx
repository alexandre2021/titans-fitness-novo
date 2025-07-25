import { NavLink } from "react-router-dom";
import { Home, Dumbbell, BarChart3 } from "lucide-react";

const AlunoBottomNav = () => {
  const navigationItems = [
    {
      title: "Inicial",
      href: "/index-aluno",
      icon: Home,
    },
    {
      title: "Treinos",
      href: "/treinos-aluno",
      icon: Dumbbell,
    },
    {
      title: "Avaliações",
      href: "/avaliacoes-aluno",
      icon: BarChart3,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
      <nav className="flex">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-2 px-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AlunoBottomNav;