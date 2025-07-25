import { Phone, Mail, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/assets/logo-medapp.png"
                alt="Logo MedAPP"
                width={48}
                height={48}
                style={{ borderRadius: "12px" }}
              />
              <span
                className="truncate block max-w-[60vw] md:max-w-none"
                style={{
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                  background: "linear-gradient(90deg, #00b4d8, #48cae4, #0077b6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                MedAPP
              </span>
            </div>
            <p className="text-sm text-background/70 break-words max-w-full">
              Votre plateforme de santé numérique au Gabon. Simplifiez vos démarches médicales 
              avec nos services en ligne sécurisés et accessibles.
            </p>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Services</h4>
            <ul className="space-y-2 text-sm text-background/70 break-words max-w-full">
              <li><a href="#rendez-vous" className="hover:text-background transition-colors">Prise de rendez-vous</a></li>
              <li><a href="#ordonnances" className="hover:text-background transition-colors">Renouvellement d&apos;ordonnances</a></li>
              <li><a href="#dossier" className="hover:text-background transition-colors">Dossier médical</a></li>
              <li><a href="#localisation" className="hover:text-background transition-colors">Géolocalisation</a></li>
              <li><a href="#paiement" className="hover:text-background transition-colors">Paiement en ligne</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact</h4>
            <div className="space-y-2 text-sm text-background/70 break-words max-w-full">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+241 01 23 45 67</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>contact@medapp.ga</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Libreville, Gabon</span>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Newsletter</h4>
            <p className="text-sm text-background/70">
              Restez informé des nouveautés et conseils santé
            </p>
            <div className="flex space-x-2 flex-wrap w-full">
              <input 
                type="email" 
                placeholder="Votre email"
                className="flex-1 px-3 py-2 text-sm text-foreground bg-background rounded-md min-w-0 max-w-full"
              />
              <Button className="bg-primary hover:bg-primary/90 min-w-fit max-w-full">
                S&apos;abonner
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div className="text-sm text-background/70 mb-4 md:mb-0 break-words max-w-full text-center md:text-left">
            © 2024 MedApp - Mon Profil Santé Gabon. Tous droits réservés.
          </div>
          
          <div className="flex space-x-4 flex-wrap">
            <Button className="text-background/70 hover:text-background">
              <Facebook className="w-4 h-4" />
            </Button>
            <Button className="text-background/70 hover:text-background">
              <Twitter className="w-4 h-4" />
            </Button>
            <Button className="text-background/70 hover:text-background">
              <Instagram className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;