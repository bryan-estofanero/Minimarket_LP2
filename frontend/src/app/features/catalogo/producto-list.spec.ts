import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { of, throwError } from "rxjs";
import { ApiService } from "../../core/services/api-service";
import { AuthService } from "../../core/services/auth-service";
import { ProductoList } from "./producto-list";
import { Producto } from "../../core/models/models";

describe("Catálogo de productos e inventario", () => {
  let api: {
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
  const mockCategorias = [{ id: 1, nombre: "Lácteos" }, { id: 2, nombre: "Abarrotes" }];
  const mockProductos: Producto[] = [
    { id: 1, codigo: "LAC-001", nombre: "Leche evaporada 400 g", categoria: { id: 1, nombre: "Lácteos" }, precio: 4.5, stock: 25, stockMinimo: 6, unidadVenta: "UNIDAD", activo: true },
    { id: 2, codigo: "AB-001", nombre: "Arroz 1 kg", categoria: { id: 2, nombre: "Abarrotes" }, precio: 4.5, stock: 5, stockMinimo: 6, unidadVenta: "UNIDAD", activo: true },
    { id: 3, codigo: "AC-001", nombre: "Aceite 1 L", categoria: { id: 2, nombre: "Abarrotes" }, precio: 8.0, stock: 0, stockMinimo: 6, unidadVenta: "UNIDAD", activo: true },
  ];

  beforeEach(() => {
    api = {
      get: vi.fn((url: string) => {
        if (url === "/categorias") return of(mockCategorias);
        if (url === "/productos") {
          return of({
            content: mockProductos,
            number: 0,
            size: 10,
            totalElements: 3,
            totalPages: 1,
          });
        }
        return of({});
      }),
      delete: vi.fn(() => of(undefined)),
      put: vi.fn(() => of({ ...mockProductos[0], activo: false })),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { tiene: () => true } },
      ],
    });
  });

  afterEach(() => {
    localStorage.removeItem("mm_productos_inactivos");
    vi.restoreAllMocks();
  });

  it("calcula correctamente los indicadores: Disponible y Stock bajo, y no muestra 'Sin stock'", () => {
    const fixture = TestBed.createComponent(ProductoList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain("Leche evaporada 400 g");
    expect(el.textContent).toContain("Arroz 1 kg");
    expect(el.textContent).toContain("Aceite 1 L");

    // Indicadores según reglas
    expect(el.textContent).toContain("Disponible");
    expect(el.textContent).toContain("Stock bajo");
    expect(el.textContent).not.toContain("Sin stock");

    // Botones de acción: contiene Eliminar y no contiene Ver ficha
    expect(el.textContent).toContain("Eliminar");
    expect(el.textContent).not.toContain("Ver ficha");
  });

  it("no convierte un fallo de API en lista vacía y permite reintentar", () => {
    api.get.mockImplementation((url: string) => {
      if (url === "/categorias") return of(mockCategorias);
      if (url === "/productos") {
        return throwError(() => ({ status: 500, error: { detail: "Error del servidor al listar" } }));
      }
      return of({});
    });

    const fixture = TestBed.createComponent(ProductoList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).toContain("Error del servidor al listar");
    expect(el.textContent).not.toContain("No hay productos que coincidan");
    expect(el.querySelector("table")).toBeNull();

    // Reintentar
    api.get.mockImplementation((url: string) => {
      if (url === "/categorias") return of(mockCategorias);
      if (url === "/productos") {
        return of({
          content: mockProductos,
          number: 0,
          size: 10,
          totalElements: 3,
          totalPages: 1,
        });
      }
      return of({});
    });

    const reintentarBtn = [...el.querySelectorAll("button")].find((b) => b.textContent?.includes("Reintentar"));
    expect(reintentarBtn).toBeDefined();
    reintentarBtn?.click();
    fixture.detectChanges();

    expect(el.querySelector("table")).not.toBeNull();
    expect(el.textContent).toContain("Leche evaporada 400 g");
  });

  it("elimina normalmente tanto productos sin operaciones como productos con historial sin mostrar errores", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fixture = TestBed.createComponent(ProductoList);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    // Caso 1: Producto sin operaciones se elimina directamente
    comp.eliminar(mockProductos[2]);
    expect(api.delete).toHaveBeenCalledWith("/productos/3");

    // Caso 2: Producto con historial en ventas/compras se retira de la lista normalmente sin mostrar alerta roja
    api.delete.mockReturnValueOnce(
      throwError(() => ({
        status: 409,
        error: {
          detail: "Código duplicado o registro relacionado con otras operaciones.",
        },
      })),
    );
    comp.eliminar(mockProductos[0]);
    fixture.detectChanges();

    expect(comp.error()).toBe("");
    expect(el.textContent).toContain("eliminado correctamente");
    expect(el.querySelector("table")?.textContent).not.toContain("Leche evaporada 400 g");
  });
});
