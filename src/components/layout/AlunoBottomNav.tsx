import { NavLink } from "react-router-dom";
import { LayoutDashboard, Dumbbell, MoreHorizontal, User, BarChart3 } from "lucide-react";

const AlunoBottomNav = () => {
  const navigationItems = [
    {
      title: "Painel",
      href: "/index-aluno",
      icon: LayoutDashboard,
    },
    {
      title: "Rotinas",
      href: "/minhas-rotinas",
      icon: Dumbbell,
    },
    {
      title: "Professores",
      href: "/professores",
      icon: User,
    },
    {
      title: "Avaliações",
      href: "/avaliacoes-aluno",
      icon: BarChart3,
    },
    {
      title: "Mais",
      href: "/mais",
      icon: MoreHorizontal,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t md:hidden">
      <nav className="flex">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center py-2 px-1 transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary text-secondary-foreground/90 hover:text-secondary-foreground"
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