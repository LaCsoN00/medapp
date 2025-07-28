"use client";

import MedicalExamsSection from "@/components/MedicalExamsSection";
import Header from "@/components/Header";
import BottomNavBar from "@/components/BottomNavBar";
import { useAuth } from "@/../hooks/useAuth";
import { redirect, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/../hooks/use-mobile";
import { Suspense } from "react";

export default function MedicalExamsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  if (!isLoading && !user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      <div className="pt-24 pb-24">
        <div className="container mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 text-primary hover:bg-primary/10"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            {!isMobile && (
              <Badge variant="outline" className="ml-1 font-normal">
                Retour
              </Badge>
            )}
          </Button>
        </div>
        <Suspense fallback={<div className="text-center py-8">Chargement...</div>}>
          <MedicalExamsSection />
        </Suspense>
      </div>
      <BottomNavBar />
    </>
  );
} 