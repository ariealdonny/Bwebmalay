import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="glass-card w-full max-w-md p-8 rounded-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-red-500/10 text-red-500">
            <AlertCircle className="w-12 h-12" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-white text-black hover:bg-white/90 transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  );
}
