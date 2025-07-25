"use client"

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from 'next/navigation';
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-3xl bg-white/90 shadow-lg rounded-full px-4 sm:px-6 py-3 flex items-center justify-between border border-gray-200 backdrop-blur-md">
      <div className="flex items-center gap-3 font-bold text-lg sm:text-xl cursor-pointer select-none max-w-[70vw] sm:max-w-none overflow-hidden">
        <Image
          src="/assets/logo-medapp.png"
          alt="Logo MedAPP"
          width={44}
          height={44}
          style={{ borderRadius: "12px" }}
        />
        <span
          className="truncate block max-w-[40vw] sm:max-w-none"
          style={{
            fontWeight: "bold",
            fontSize: "2rem",
            background: "linear-gradient(90deg, #00b4d8, #48cae4, #0077b6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          MedApp
        </span>
      </div>
      {user && (
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white shadow">
            {user.photo ? (
              <AvatarImage src={user.photo} alt="Photo de profil" />
            ) : (
              <AvatarFallback>
                {user.firstName?.[0] || user.email[0] || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col items-end max-w-[40vw] sm:max-w-none overflow-hidden">
            <span className="text-gray-700 font-semibold leading-tight text-sm sm:text-base truncate break-words max-w-full">{user.firstName} {user.lastName}</span>
            <span className="text-xs text-blue-500 font-medium uppercase tracking-wide truncate max-w-full">{user.role}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1 bg-red-500 text-white rounded-full hover:bg-red-600 text-xs font-semibold shadow">
            <LogOut className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      )}
    </header>
  );
}