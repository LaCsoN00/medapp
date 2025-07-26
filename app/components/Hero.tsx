"use client"
import { ArrowRight, Shield, Clock, Users, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from "next/image";
import { useRouter } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const Hero = () => {
  const router = useRouter();
  
  const features = [
    { icon: <Shield className="w-5 h-5" />, text: "Données sécurisées" },
    { icon: <Clock className="w-5 h-5" />, text: "24/7 Disponible" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "Certifié RGPD" },
  ];

  const stats = [
    { icon: <Users className="w-6 h-6" />, value: "50K+", label: "Patients" },
    { icon: <Star className="w-6 h-6" />, value: "4.9", label: "Note moyenne" },
    { icon: <Shield className="w-6 h-6" />, value: "100%", label: "Sécurisé" },
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-base-100 to-base-200 min-h-screen flex items-center relative">
      {/* Header avec toggle de thème */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="max-w-6xl mx-auto w-full px-2 sm:px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image - First on mobile, right on desktop */}
          <div className="relative order-first lg:order-last">
            <Card className="overflow-hidden shadow-xl">
              <Image
                src="/assets/hero-medical.jpg"
                alt="Consultation médicale professionnelle"
                width={600}
                height={400}
                className="w-full h-[300px] sm:h-[400px] lg:h-[500px] object-cover"
                priority
              />
            </Card>
            
            {/* Floating Cards */}
            <div className="absolute -top-4 -right-4 card bg-base-100/90 backdrop-blur-sm shadow-lg border border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-secondary rounded-full animate-pulse"></div>
                  <div>
                    <div className="text-sm font-semibold text-base-content">Consultation en cours</div>
                    <div className="text-xs text-base-content/70">Dr. Sarah MBOMA</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 card bg-base-100/90 backdrop-blur-sm shadow-lg border border-base-300">
              <div className="card-body p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                  <div>
                    <div className="text-sm font-semibold text-base-content">Rendez-vous confirmé</div>
                    <div className="text-xs text-base-content/70">Demain 14:30</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-8 card bg-success shadow-lg">
            </div>
          </div>

          {/* Left Content */}
          <div className="space-y-8 order-2 lg:order-first">
            {/* Main Heading */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="heading-responsive font-bold text-base-content leading-tight">
                  Votre santé au
                  <span className="text-primary"> bout des doigts</span>
                </h1>
                <p className="text-responsive text-base-content/70 max-w-2xl">
                  MedApp simplifie votre parcours de soins au Gabon. Prenez rendez-vous, 
                  gérez vos ordonnances et accédez à vos données médicales en toute sécurité.
                </p>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm font-medium text-base-content/70">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="btn btn-primary"
                onClick={() => router.push('/register')}
              >
                Commencer maintenant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => router.push('/login')}
              >
                Se connecter
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2 text-primary">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-base-content">{stat.value}</div>
                  <div className="text-sm text-base-content/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;