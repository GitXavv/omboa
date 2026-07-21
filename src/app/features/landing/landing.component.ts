import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoRequestSectionComponent } from './demo-request-section/demo-request-section.component';

interface Feature {
  icon: string;
  title: string;
  desc: string;
  learnMoreLink?: string;
}

interface Faq {
  question: string;
  answer: string;
}

// Landing plateforme - s'adresse aux restaurateurs qui envisagent Omboa, pas aux clients
// d'un restaurant en particulier (voir l'ancienne version pour le contenu vitrine
// "O'Mboa restaurant" qui vivait ici avant ; ce contenu-là appartient désormais à la page
// menu de chaque restaurant, pas à la landing globale).
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DemoRequestSectionComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  readonly steps = [
    { icon: '📱', title: 'Le client scanne le QR code', desc: 'Chaque table a son propre QR code. Aucune application à installer, le menu s\'ouvre directement dans le navigateur.' },
    { icon: '🍽', title: 'Il compose sa commande', desc: 'Le client parcourt le menu, ajoute ses plats et valide - depuis son téléphone, sans attendre le serveur.' },
    { icon: '⚡', title: 'Cuisine et réception reçoivent en temps réel', desc: 'La commande apparaît instantanément sur les tableaux de bord. Zéro ressaisie, zéro oubli.' },
    { icon: '✅', title: 'Vous gardez le contrôle', desc: 'Suivi des commandes, des tables et des statistiques depuis une seule interface - vous voyez tout, en direct.' },
  ];

  readonly features: Feature[] = [
    { icon: '📱', title: 'Commande à table par QR code', desc: 'Pas d\'application à télécharger, ni pour vous ni pour vos clients. Le client scanne, commande, c\'est fait.' },
    { icon: '⚡', title: 'Cuisine, réception et sortie synchronisées', desc: 'Chaque rôle a son tableau de bord, mis à jour en temps réel. Plus de commandes perdues entre la salle et la cuisine.' },
    { icon: '🎨', title: 'Personnalisation visuelle par restaurant', desc: 'Logo, adresse, couleurs de marque appliquées automatiquement sur votre interface en thème sombre - pas un thème générique.' },
    { icon: '🏆', title: 'Programme de fidélité automatique', desc: 'Vos clients cumulent des points à chaque commande, sans que vous ayez à gérer quoi que ce soit - plus de détails dans la section dédiée ci-dessous.' },
  ];

  readonly faqs: Faq[] = [
    { question: 'Est-ce que Omboa est payant ?', answer: 'Contactez-nous via le formulaire de démo pour connaître les conditions actuelles - elles dépendent de la taille de votre restaurant et sont discutées directement avec vous.' },
    { question: 'Faut-il une application à installer ?', answer: 'Non. Ni vos clients, ni votre équipe n\'ont besoin d\'installer quoi que ce soit. Tout se passe dans le navigateur, sur téléphone comme sur ordinateur.' },
    { question: 'Puis-je garder mon menu, mes prix et mes photos actuels ?', answer: 'Oui, c\'est vous (ou notre équipe à la mise en place) qui renseignez votre menu complet - catégories, plats, prix, photos - rien n\'est imposé.' },
    { question: 'Qui s\'occupe des tables et des QR codes ?', answer: 'Une fois votre restaurant créé, vous générez et gérez vos tables directement depuis votre interface d\'administration - chaque table a son QR code dédié.' },
    { question: 'Puis-je personnaliser les couleurs de mon interface ?', answer: 'Oui - chaque restaurant a ses propres couleurs de marque, appliquées automatiquement partout dans son interface.' },
    { question: 'Y a-t-il un programme de fidélité ?', answer: 'Oui, il est intégré et automatique : vos clients cumulent des points à chaque commande, sans configuration de votre part.' },
  ];

  readonly openFaqs = signal<Set<number>>(new Set());

  toggleFaq(i: number) {
    this.openFaqs.update(s => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  isFaqOpen(i: number) { return this.openFaqs().has(i); }
}
