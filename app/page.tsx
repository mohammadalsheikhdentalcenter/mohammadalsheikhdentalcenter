"use client";

import { useAuth } from "@/components/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // ��� Wait until loading completes

    const path = window.location.pathname;

    // ✅ Only redirect from the root path "/"
    if (path === "/") {
      if (user) router.replace("/dashboard");
      else router.replace("/login");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Dr.Mohammad Alsheikh Dental Center
        </h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
