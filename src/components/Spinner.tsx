import { Loader2 } from "lucide-react";

export const Spinner = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center justify-center py-12 ${className}`}>
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);
