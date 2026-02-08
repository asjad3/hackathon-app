import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/shared/models/auth";
import { apiUrl } from "@/lib/api";

async function fetchUser(): Promise<User | null> {
  const response = await fetch(apiUrl("/api/auth/status"), {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // If not authenticated, return null
  if (!data.authenticated) {
    return null;
  }

  // Return user object from userId
  return {
    id: data.userId,
    email: null,
    firstName: null,
    lastName: null,
    profileImageUrl: null,
    createdAt: null,
    updatedAt: null
  };
}

async function logout(): Promise<void> {
  try {
    // Call logout endpoint
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    // Clear localStorage
    localStorage.removeItem('userId');
    // Redirect to login page
    window.location.href = "/login";
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/status"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/status"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
