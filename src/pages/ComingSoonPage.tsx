import { Clock } from "lucide-react";

interface ComingSoonPageProps {
  title?: string;
  description?: string;
}

export default function ComingSoonPage({
  title = "Coming Soon",
  description = "This feature is under development.",
}: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Clock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
