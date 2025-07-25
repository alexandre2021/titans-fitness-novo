import { NavLink } from "react-router-dom";
import { Home, Dumbbell, Users, CalendarDays, MessageCircle } from "lucide-react";

const PTBottomNav = () => {
  const navigationItems = [
    {
      title: "Inicial",
      href: "/index-pt",
      icon: Home,
    },
    {
      title: "Exercícios",
      href: "/exercicios-pt",
      icon: Dumbbell,
    },
    {
      title: "Alunos",
      href: "/alunos-pt",
      icon: Users,
    },
    {
      title: "Agenda",
      href: "/agenda-pt",
      icon: CalendarDays,
    },
    {
      title: "Mensagens",
      href: "/mensagens-pt",
      icon: MessageCircle,
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

export default PTBottomNav;