import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../core/services/auth-service";
@Component({
  selector: "app-login",
  template: `<main class="login">
    <div class="panel">
      <span class="eyebrow">MINIMARKET</span>
      <h1>Tu tienda,<br />en orden.</h1>
      <p>Ventas, compras e inventario en un mismo lugar.</p>
      <button class="primary" (click)="entrar()" [disabled]="loading()">
        {{ loading() ? "Conectando…" : "Iniciar sesión" }}
      </button>
      @if (error()) {
        <p role="alert" class="error">{{ error() }}</p>
      }
      <small>Acceso para personal autorizado</small>
    </div>
  </main>`,
})
export class Login {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  loading = signal(false);
  error = signal("");
  async entrar() {
    this.loading.set(true);
    try {
      await this.auth.login(
        this.route.snapshot.queryParamMap.get("returnUrl") || "/",
      );
    } catch {
      this.error.set("No se pudo abrir el acceso. Intente de nuevo.");
      this.loading.set(false);
    }
  }
}
