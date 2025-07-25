"use client"

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { FaHeartbeat } from "react-icons/fa";
import { useRouter } from 'next/navigation';

const roles = [
  { value: "PATIENT", label: "Patient" },
  { value: "MEDECIN", label: "Médecin" },
  { value: "DOCTEUR", label: "Docteur" },
];

type Role = "PATIENT" | "MEDECIN" | "DOCTEUR";

export default function AuthForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState<{
    email: string;
    password: string;
    role: Role;
    firstName: string;
    lastName: string;
    specialty: string;
    phone: string;
  }>({
    email: "",
    password: "",
    role: "PATIENT",
    firstName: "",
    lastName: "",
    specialty: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      !user &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/' &&
      window.location.pathname !== '/login'
    ) {
      router.replace('/');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // N'autoriser que les chiffres, espaces, tirets, parenthèses et +
      const phoneValue = value.replace(/[^0-9+\-\s\(\)]/g, '');
      setForm(prev => ({
        ...prev,
        [name]: phoneValue,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: name === "role" ? value as Role : value,
      }));
    }
  };

  const handlePhoneFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      e.target.value = "+241 ";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
          firstName: form.firstName,
          lastName: form.lastName,
          specialty: form.specialty,
          phone: form.phone,
        }),
      }).then(r => r.json());
      setLoading(false);
      if (res.user) {
        toast.success("Inscription réussie ! Connexion automatique...", { position: 'top-center' });
        login(res.user);
        setTimeout(() => router.push('/appointment'), 500);
      } else {
        toast.error("Erreur : " + (res.error || 'Erreur inconnue'), { position: 'top-center' });
      }
    } else {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      }).then(r => r.json());
      setLoading(false);
      if (res.user) {
        toast.success("Connexion réussie !", { position: 'top-center' });
        login(res.user);
        setTimeout(() => router.push('/appointment'), 500);
      } else {
        toast.error("Erreur : " + (res.error || 'Erreur inconnue'), { position: 'top-center' });
      }
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="bg-white/90 rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center relative overflow-hidden">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-tr from-blue-400 to-pink-400 p-4 rounded-full shadow-lg animate-bounce mb-2">
            <FaHeartbeat className="text-3xl text-white animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-blue-700 mb-1 tracking-tight drop-shadow">Gabon Santé Digital</h2>
          <span className="text-base text-gray-500 font-medium mb-2 animate-fade-in">{isRegister ? "Créer un compte" : "Connexion à votre espace"}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <input
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="username"
          />
          <input
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />
          {isRegister && (
            <>
              <div className="flex gap-2">
                <input
                  className="w-1/2 border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
                  type="text"
                  name="firstName"
                  placeholder="Prénom"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
                <input
                  className="w-1/2 border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
                  type="text"
                  name="lastName"
                  placeholder="Nom"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              {form.role === "PATIENT" && (
                <input
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
                  type="tel"
                  name="phone"
                  placeholder="Téléphone"
                  value={form.phone}
                  onChange={handleChange}
                  onFocus={handlePhoneFocus}
                  pattern="[0-9+\-\s\(\)]+"
                  title="Veuillez entrer un numéro de téléphone valide"
                />
              )}
              <select
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {(form.role === "MEDECIN" || form.role === "DOCTEUR") && (
                <input
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400 transition-all duration-200 shadow-sm bg-white/80"
                  type="text"
                  name="specialty"
                  placeholder="Spécialité (pour les médecins)"
                  value={form.specialty}
                  onChange={handleChange}
                  required
                />
              )}
            </>
          )}
          <button
            className="w-full bg-gradient-to-r from-blue-500 to-pink-500 text-white py-2 rounded-lg font-semibold shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 disabled:cursor-not-allowed animate-fade-in"
            type="submit"
            disabled={loading}
          >
            {loading ? "Envoi..." : isRegister ? "S'inscrire" : "Se connecter"}
          </button>
        </form>
        <div className="text-center mt-4">
          <button
            className="text-blue-600 hover:underline font-medium transition-colors duration-200"
            onClick={() => setIsRegister(r => !r)}
          >
            {isRegister ? "Déjà un compte ? Se connecter" : "Créer un compte"}
          </button>
        </div>
      </div>
    </div>
  );
} 