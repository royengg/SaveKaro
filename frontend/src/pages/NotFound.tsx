import { PageBackButton } from "@/components/navigation/PageBackButton";

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-8xl mb-6">🔍</div>
      <h1 className="text-4xl font-bold mb-3">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <PageBackButton to="/" />
    </div>
  );
}

export default NotFound;
