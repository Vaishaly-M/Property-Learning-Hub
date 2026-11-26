"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface LoginPayload {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  role: "admin" | "instructor" | "learner";
  profile_completed?: boolean;
}

function getRedirect(user: User): string {
  if (user.role === "admin") return "/admin/dashboard";
  if (user.role === "instructor")
    return user.profile_completed
      ? "/instructor/dashboard"
      : "/profile/instructor";
  if (user.role === "learner")
    return user.profile_completed ? "/learn" : "/profile/learner";
  return "/";
}

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async ({ email, password }: LoginPayload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid email or password");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.replace(getRedirect(data.user));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  };

  return { login, logout, loading, error };
}
