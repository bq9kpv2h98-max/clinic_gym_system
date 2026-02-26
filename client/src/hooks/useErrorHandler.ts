import { useCallback } from "react";
import { toast } from "sonner";

export function useErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    console.error(`Error${context ? ` in ${context}` : ""}:`, error);
    
    let message = "エラーが発生しました";
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }
    
    toast.error(context ? `${context}: ${message}` : message);
  }, []);

  const handleSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const handleInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);

  return { handleError, handleSuccess, handleInfo };
}
