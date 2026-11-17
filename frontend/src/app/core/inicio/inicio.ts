import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../services/auth-service";
@Component({
  imports: [RouterLink],
  template: `<div class="page-heading">
      <div>
        <span class="eyebrow">TU ESPACIO DE TRABAJO</span>
        <h1>Bienvenido, {{ auth.nombre() }}</h1>
        <p>Elige una operación para comenzar.</p>
      </div>
    </div>
    <div class="cards">
      <a class="panel feature-card" routerLink="/productos"
        ><span>01 · CATÁLOGO</span>
        <h2>Productos e inventario</h2>
        <p>Consulta precios y existencias disponibles.</p></a
      >
      @if (auth.tiene("ADMIN", "SUPERVISOR", "VENDEDOR")) {
        <a class="panel feature-card" routerLink="/ventas"
          ><span>02 · VENTAS</span>
          <h2>Atiende una venta</h2>
          <p>Registra productos y consulta las operaciones realizadas.</p></a
        >
      }
      @if (auth.tiene("ADMIN", "SUPERVISOR", "COMPRADOR")) {
        <a class="panel feature-card" routerLink="/compras"
          ><span>03 · COMPRAS</span>
          <h2>Abastece la tienda</h2>
          <p>
            Registra compras recibidas e ingresa productos al inventario.
          </p></a
        >
      }
    </div>`,
})
export class Inicio {
  auth = inject(AuthService);
}
