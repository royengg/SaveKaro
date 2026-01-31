import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (token) {
      login(token).then(() => {
        navigate("/", { replace: true });
      });
    } else {
      navigate("/auth/error?message=No token received", { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-semibold">Signing you in...</h1>
      <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
    </div>
  );
}

export function AuthError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const message = searchParams.get("message") || "An error occurred during authentication";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-6xl mb-4">😕</div>
      <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">{message}</p>
      <button
        onClick={() => navigate("/")}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Back to Home
      </button>
    </div>
  );
}

export default AuthCallback;
