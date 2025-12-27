import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const [canScroll, setCanScroll] = React.useState(false)
  const [scrollPosition, setScrollPosition] = React.useState(0)
  const [totalTabs, setTotalTabs] = React.useState(0)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        
        // Verificar se há scroll disponível (em qualquer direção)
        const hasScroll = scrollWidth > clientWidth
        setCanScroll(hasScroll)
        
        // Contar número de tabs filhos
        const tabsCount = scrollRef.current.children.length
        setTotalTabs(tabsCount)
        
        // Calcular posição das bolinhas baseado no scroll
        const maxScroll = scrollWidth - clientWidth
        if (maxScroll > 0) {
          const scrollPercent = scrollLeft / maxScroll
          const currentDot = Math.round(scrollPercent * (tabsCount - 1))
          setScrollPosition(currentDot)
        } else {
          setScrollPosition(0)
        }
      }
    }

    const scrollElement = scrollRef.current
    if (scrollElement) {
      checkScroll()
      scrollElement.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
      
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [])

  return (
    <div className="relative w-full">
      <TabsPrimitive.List
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          scrollRef.current = node
        }}
        className={cn(
          // Layout base
          "flex items-center",
          "w-full h-10",
          "p-1 gap-1",
          "rounded-md bg-muted border border-border/30",
          "text-muted-foreground",
          // Mobile: scroll horizontal
          "overflow-x-auto md:overflow-visible",
          "scrollbar-hide",
          // Scroll suave
          "scroll-smooth",
          // Hide scrollbar
          "[&::-webkit-scrollbar]:hidden",
          "[-ms-overflow-style:none]",
          "[scrollbar-width:none]",
          className
        )}
        {...props}
      />
      
      {/* Scroll Dots - só no mobile quando há scroll e mais de 2 tabs */}
      {canScroll && totalTabs > 2 && (
        <div className="flex justify-center gap-1 mt-1 md:hidden">
          {Array.from({ length: totalTabs }, (_, index) => (
            <div
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                index === scrollPosition 
                  ? "bg-primary w-3" 
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Layout
      "inline-flex items-center justify-center",
      "rounded-sm px-4 py-2",
      "text-base font-medium",
      "ring-offset-background transition-all duration-200",
      // Comportamento
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      // Estados com transições suaves
      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      "hover:bg-background/60 hover:text-foreground/80",
      // Mobile otimizado
      "whitespace-nowrap flex-shrink-0",
      "min-w-fit",
      // Micro-interação
      "active:scale-95",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }