import { Link } from "wouter";
import { ArrowLeft, Menu, Bell } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export function Layout({ children, title, showBack = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto relative overflow-hidden shadow-2xl border-x border-white/5">
      {/* Dynamic Background Effect */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-background/80 sticky top-0">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-white/80 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          ) : (
            <button className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-white/80">
              <Menu className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-lg font-display font-bold tracking-wide text-white">
            {title || "BIMB Secure"}
          </h1>
        </div>
        
        <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/80 relative">
          <Bell className="w-6 h-6" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background"></span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 relative z-0 p-4 pb-20 overflow-y-auto scrollbar-hide">
        {children}
      </main>
    </div>
  );
}
