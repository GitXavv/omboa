import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DemoRequestService } from '../../../core/services/demo-request.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { ToastService } from '../../../core/services/toast.service';
import { ColorPickerComponent } from '../../../shared/components/color-picker/color-picker.component';
import { slugify } from '../../../core/utils/slug';

interface DemoForm {
  email: string;
  name: string;
  address: string;
  color_primary: string;
  color_secondary: string;
}

const DEFAULT_COLOR_PRIMARY = '#C87D60';
const DEFAULT_COLOR_SECONDARY = '#6B4030';

// "Réservez une démo" — dernière section de la landing, sur le modèle de Djelica (bouton
// header qui scroll jusqu'ici). Contrairement au formulaire de Djelica (texte seul), on
// demande ici tout ce qui compose une fiche restaurant (sauf tag/is_active/archived/
// created_at, gérés par le super admin) : c'est un lead, pas une création de compte — le
// super admin crée le restaurant lui-même une fois le contact établi.
@Component({
  selector: 'app-demo-request-section',
  standalone: true,
  imports: [FormsModule, ColorPickerComponent],
  templateUrl: './demo-request-section.component.html',
  styleUrl: './demo-request-section.component.css'
})
export class DemoRequestSectionComponent {
  private readonly demoSvc   = inject(DemoRequestService);
  private readonly imgUpload = inject(ImageUploadService);
  private readonly toast     = inject(ToastService);

  readonly form = signal<DemoForm>({
    email: '', name: '', address: '',
    color_primary: DEFAULT_COLOR_PRIMARY, color_secondary: DEFAULT_COLOR_SECONDARY
  });

  readonly tag = () => slugify(this.form().name);

  readonly logoFile    = signal<File | null>(null);
  readonly logoPreview = signal<string | null>(null);

  readonly submitting = signal(false);
  readonly submitted  = signal(false);

  updateField<K extends keyof DemoForm>(key: K, value: DemoForm[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  async onLogoFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Fichier trop volumineux (maximum 5 Mo).');
      return;
    }
    this.logoFile.set(file);
    this.logoPreview.set(await this.imgUpload.readAsDataUrl(file));
  }

  async submit() {
    const f = this.form();
    if (!f.email.trim() || !f.name.trim()) {
      this.toast.error('Email et nom du restaurant sont requis.');
      return;
    }

    this.submitting.set(true);
    try {
      let logoUrl: string | undefined;
      const file = this.logoFile();
      if (file) logoUrl = await firstValueFrom(this.demoSvc.uploadLogo(file));

      await firstValueFrom(this.demoSvc.submit({
        email: f.email,
        name: f.name,
        tag: this.tag(),
        logo_url: logoUrl,
        address: f.address || undefined,
        color_primary: f.color_primary,
        color_secondary: f.color_secondary
      }));

      this.submitted.set(true);
    } catch {
      this.toast.error('Une erreur est survenue. Réessayez ou contactez-nous directement.');
    } finally {
      this.submitting.set(false);
    }
  }
}
