TAREAS DE CORRECCIÓN CRYPTO ERP - PARA VS CODE
Copia todo esto y pégalo en un archivo FIXES.md o directamente en tu gestor de tareas:

🔴 PRIORIDAD ALTA
TAREA 1: Implementar endpoint PUT para Company Settings
ARCHIVO: apps/api/src/routes/companies.ts (o controllers/companies.controller.ts)
PROBLEMA: Error "Cannot PUT /api/v1/companies/current" al guardar configuración de empresa
CAMBIO: Crear/habilitar endpoint PUT para actualizar datos de empresa

// Ejemplo de implementación:
router.put('/current', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      companyName, 
      taxId, 
      address, 
      city, 
      postalCode, 
      country, 
      email, 
      phone, 
      website 
    } = req.body;
    
    // Validación
    if (!companyName || !taxId) {
      return res.status(400).json({ error: 'Company name and Tax ID are required' });
    }
    
    // Actualizar en base de datos
    const company = await Company.findOneAndUpdate(
      { userId },
      { companyName, taxId, address, city, postalCode, country, email, phone, website },
      { new: true, upsert: true }
    );
    
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update company' });
  }
});

TAREA 2: Arreglar envío de mensajes en AI Assistant
ARCHIVO: apps/web/src/app/features/ai/chat/chat.component.ts
PROBLEMA: Los mensajes no se envían al hacer clic en el botón o presionar Enter
CAMBIO: Verificar el binding del evento y la conexión con el servicio de AI

// Verificar que exista el método sendMessage y esté conectado:
async sendMessage() {
  if (!this.messageInput.trim()) return;
  
  this.isLoading = true;
  const userMessage = this.messageInput;
  this.messageInput = '';
  
  // Agregar mensaje del usuario al chat
  this.messages.push({ role: 'user', content: userMessage });
  
  try {
    const response = await this.aiService.sendMessage(userMessage);
    this.messages.push({ role: 'assistant', content: response });
  } catch (error) {
    console.error('Error sending message:', error);
    // Mostrar error al usuario
    this.notificationService.error('Error al enviar mensaje');
  } finally {
    this.isLoading = false;
  }
}

// En el template HTML, verificar:
<textarea 
  [(ngModel)]="messageInput" 
  (keydown.enter)="$event.preventDefault(); sendMessage()"
  placeholder="Type your question...">
</textarea>
<button (click)="sendMessage()" [disabled]="isLoading">
  <span *ngIf="!isLoading">➤</span>
  <mat-spinner *ngIf="isLoading" diameter="20"></mat-spinner>
</button>

🟡 PRIORIDAD MEDIA
TAREA 3: Agregar min-width a botones CTA para evitar truncamiento
ARCHIVO: apps/web/src/styles.scss
PROBLEMA: Botones "+ New Transaction", "+ Add Wallet" etc. aparecen truncados
CAMBIO: Agregar estilos globales para botones primarios

/* Agregar al final del archivo styles.scss */

/* Fix para botones CTA truncados */
.btn-primary,
button[mat-raised-button],
a[mat-raised-button],
.mat-mdc-raised-button.mat-primary {
  min-width: 150px !important;
  white-space: nowrap !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
}

/* Botones en headers de página */
.page-header .btn-primary,
.page-header button[mat-raised-button] {
  min-width: 160px !important;
}

/* Fix para columnas de tabla truncadas */
.mat-mdc-table {
  th.mat-mdc-header-cell,
  td.mat-mdc-cell {
    min-width: 80px;
    
    &.actions-column {
      min-width: 100px;
    }
  }
}

/* Tablas con scroll horizontal en móvil */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

TAREA 4: Agregar tooltips al sidebar colapsado
ARCHIVO: apps/web/src/app/layout/main-layout/sidebar/sidebar.component.html
PROBLEMA: Cuando el sidebar está colapsado, no hay indicación del nombre del módulo
CAMBIO: Agregar matTooltip a cada item del menú

<!-- Antes -->
<a [routerLink]="item.link" routerLinkActive="active">
  <mat-icon>{{ item.icon }}</mat-icon>
  <span class="menu-label">{{ item.label }}</span>
</a>

<!-- Después -->
<a 
  [routerLink]="item.link" 
  routerLinkActive="active"
  [matTooltip]="isCollapsed ? item.label : ''"
  matTooltipPosition="right"
  [matTooltipDisabled]="!isCollapsed">
  <mat-icon>{{ item.icon }}</mat-icon>
  <span class="menu-label" *ngIf="!isCollapsed">{{ item.label }}</span>
</a>

// También en sidebar.component.ts, asegurarse de importar:
import { MatTooltipModule } from '@angular/material/tooltip';

TAREA 5: Agregar feedback visual (toast/snackbar) en formularios
ARCHIVO: apps/web/src/app/shared/services/notification.service.ts
PROBLEMA: No hay feedback cuando se guardan cambios
CAMBIO: Crear/usar servicio de notificaciones

// notification.service.ts
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string) {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  error(message: string) {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  info(message: string) {
    this.snackBar.open(message, 'OK', {
      duration: 3000,
      panelClass: ['snackbar-info'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}

// En styles.scss agregar:
.snackbar-success {
  --mdc-snackbar-container-color: #4caf50;
  --mdc-snackbar-supporting-text-color: white;
}

.snackbar-error {
  --mdc-snackbar-container-color: #f44336;
  --mdc-snackbar-supporting-text-color: white;
}

.snackbar-info {
  --mdc-snackbar-container-color: #2196f3;
  --mdc-snackbar-supporting-text-color: white;
}

TAREA 6: Usar notificaciones en Company Settings
ARCHIVO: apps/web/src/app/features/settings/company/company.component.ts
PROBLEMA: No hay feedback al guardar
CAMBIO: Integrar NotificationService

import { NotificationService } from '@shared/services/notification.service';

constructor(
  private companyService: CompanyService,
  private notificationService: NotificationService
) {}

async saveChanges() {
  if (this.form.invalid) {
    this.notificationService.error('Por favor complete los campos requeridos');
    return;
  }

  this.isLoading = true;
  
  try {
    await this.companyService.updateCompany(this.form.value);
    this.notificationService.success('Configuración guardada correctamente');
  } catch (error) {
    this.notificationService.error('Error al guardar la configuración');
    console.error(error);
  } finally {
    this.isLoading = false;
  }
}

// En el template, agregar loading al botón:
<button 
  mat-raised-button 
  color="primary" 
  (click)="saveChanges()"
  [disabled]="isLoading">
  <mat-spinner *ngIf="isLoading" diameter="20" class="mr-2"></mat-spinner>
  {{ isLoading ? 'Guardando...' : 'Save Changes' }}
</button>

🟢 PRIORIDAD BAJA
TAREA 7: Mejorar campo Website con prefijo visual
ARCHIVO: apps/web/src/app/features/settings/company/company.component.html
PROBLEMA: Placeholder "https://" es confuso
CAMBIO: Usar mat-form-field con prefix

<!-- Antes -->
<mat-form-field>
  <mat-label>Website</mat-label>
  <input matInput formControlName="website" placeholder="https://">
</mat-form-field>

<!-- Después -->
<mat-form-field>
  <mat-label>Website</mat-label>
  <span matPrefix>https://</span>
  <input matInput formControlName="website" placeholder="www.ejemplo.com">
</mat-form-field>

// En el componente TS, limpiar el prefijo al guardar:
get websiteValue(): string {
  const value = this.form.get('website').value;
  if (value && !value.startsWith('http')) {
    return 'https://' + value;
  }
  return value;
}

TAREA 8: Agregar leyenda de campos obligatorios
ARCHIVO: apps/web/src/app/shared/components/form-legend/form-legend.component.ts
PROBLEMA: No hay indicación de qué significa el asterisco
CAMBIO: Crear componente de leyenda reutilizable

// form-legend.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-form-legend',
  template: `<small class="form-legend text-muted">* Campos obligatorios</small>`,
  styles: [`
    .form-legend {
      display: block;
      margin-bottom: 16px;
      font-size: 12px;
      color: #666;
    }
  `]
})
export class FormLegendComponent {}

// Uso en formularios:
<app-form-legend></app-form-legend>
<form [formGroup]="form">
  <!-- campos del formulario -->
</form>

TAREA 9: Agregar tooltip explicativo a columna Verifactu
ARCHIVO: apps/web/src/app/features/invoicing/invoices/invoices.component.html
PROBLEMA: Usuarios no entienden qué es "Verifactu"
CAMBIO: Agregar tooltip informativo

<!-- Antes -->
<th mat-header-cell *matHeaderCellDef>Verifactu</th>

<!-- Después -->
<th mat-header-cell *matHeaderCellDef>
  <span 
    matTooltip="Sistema de Verificación de Facturas (VeriFactu) de la AEAT. Indica si la factura cumple con la normativa española de facturación electrónica."
    matTooltipPosition="above">
    VeriFactu
    <mat-icon class="info-icon">info_outline</mat-icon>
  </span>
</th>

// Estilos para el icono:
.info-icon {
  font-size: 14px;
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-left: 4px;
  opacity: 0.6;
  cursor: help;
}

TAREA 10: Mejorar estado vacío del Dashboard con onboarding
ARCHIVO: apps/web/src/app/features/dashboard/dashboard.component.html
PROBLEMA: Estado vacío poco informativo
CAMBIO: Agregar stepper de onboarding

<!-- Reemplazar el contenido del estado vacío -->
<div class="empty-state" *ngIf="!hasCompany">
  <div class="onboarding-card">
    <img src="assets/images/building.png" alt="Company" class="onboarding-icon">
    <h2>¡Bienvenido a Crypto ERP!</h2>
    <p class="subtitle">Completa estos pasos para comenzar:</p>
    
    <div class="onboarding-steps">
      <div class="step" [class.completed]="hasCompany">
        <div class="step-number">1</div>
        <div class="step-content">
          <h4>Configura tu empresa</h4>
          <p>Agrega los datos fiscales y de contacto</p>
        </div>
        <mat-icon *ngIf="hasCompany">check_circle</mat-icon>
      </div>
      
      <div class="step" [class.completed]="hasAccounts">
        <div class="step-number">2</div>
        <div class="step-content">
          <h4>Plan de cuentas</h4>
          <p>Configura tus cuentas contables</p>
        </div>
        <mat-icon *ngIf="hasAccounts">check_circle</mat-icon>
      </div>
      
      <div class="step" [class.completed]="hasWallets">
        <div class="step-number">3</div>
        <div class="step-content">
          <h4>Conecta tus wallets</h4>
          <p>Sincroniza tus activos crypto</p>
        </div>
        <mat-icon *ngIf="hasWallets">check_circle</mat-icon>
      </div>
    </div>
    
    <button mat-raised-button color="primary" routerLink="/settings/company">
      Comenzar configuración
    </button>
  </div>
</div>

TAREA 11: Validación de dirección de wallet
ARCHIVO: apps/web/src/app/features/crypto/wallets/add-wallet-modal/add-wallet-modal.component.ts
PROBLEMA: No hay validación del formato de dirección blockchain
CAMBIO: Agregar validador personalizado

// validators/wallet-address.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function walletAddressValidator(blockchain: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    
    const patterns: { [key: string]: RegExp } = {
      'ethereum': /^0x[a-fA-F0-9]{40}$/,
      'bitcoin': /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
      'solana': /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      'polygon': /^0x[a-fA-F0-9]{40}$/,
    };
    
    const pattern = patterns[blockchain.toLowerCase()];
    if (!pattern) return null; // Si no hay patrón, no validar
    
    return pattern.test(value) ? null : { invalidAddress: true };
  };
}

// En el componente:
onBlockchainChange(blockchain: string) {
  this.form.get('address').clearValidators();
  this.form.get('address').setValidators([
    Validators.required,
    walletAddressValidator(blockchain)
  ]);
  this.form.get('address').updateValueAndValidity();
}

// En el template:
<mat-error *ngIf="form.get('address').hasError('invalidAddress')">
  Dirección de wallet inválida para {{ selectedBlockchain }}
</mat-error>

TAREA 12: Mejorar logo en sidebar colapsado
ARCHIVO: apps/web/src/app/layout/main-layout/sidebar/sidebar.component.html
PROBLEMA: Logo aparece como "Cry" cuando está colapsado
CAMBIO: Mostrar solo el icono cuando está colapsado

<!-- En la sección del logo -->
<div class="sidebar-header">
  <a routerLink="/dashboard" class="logo-link">
    <img 
      *ngIf="isCollapsed" 
      src="assets/images/logo-icon.png" 
      alt="Crypto ERP" 
      class="logo-icon">
    <span *ngIf="!isCollapsed" class="logo-text">Crypto ERP</span>
  </a>
  <button mat-icon-button (click)="toggleSidebar()">
    <mat-icon>{{ isCollapsed ? 'chevron_right' : 'chevron_left' }}</mat-icon>
  </button>
</div>

// Estilos:
.logo-icon {
  width: 32px;
  height: 32px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #4F9CF9;
}


✅ ORDEN DE IMPLEMENTACIÓN RECOMENDADO
TAREA 1 - Endpoint PUT companies (CRÍTICO - bloquea onboarding)
TAREA 2 - Fix AI Assistant (CRÍTICO - feature no funciona)
TAREA 5 - NotificationService (necesario para feedback)
TAREA 6 - Integrar notificaciones en Company Settings
TAREA 3 - CSS botones truncados (visual rápido)
TAREA 4 - Tooltips sidebar (UX rápido)
TAREA 9 - Tooltip Verifactu (copy rápido)
TAREA 7 - Campo Website (mejora menor)
TAREA 8 - Leyenda campos obligatorios (a11y)
TAREA 10 - Onboarding Dashboard (UX mejora)
TAREA 11 - Validación wallet address (UX mejora)
TAREA 12 - Logo sidebar colapsado (visual)


