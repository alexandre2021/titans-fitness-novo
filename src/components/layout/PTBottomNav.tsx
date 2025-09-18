import { NavLink } from "react-router-dom";
import { Home, Dumbbell, Users, BookCopy } from "lucide-react";

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
      title: "Modelos",
      href: "/meus-modelos",
      icon: BookCopy,
    },
    {
      title: "Alunos",
      href: "/alunos",
      icon: Users,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden">
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
            <span className="text-sm mt-1">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default PTBottomNav;