import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { VentaPos } from "./venta-pos";
import { ApiService } from "../../core/services/api-service";
import { AuthService } from "../../core/services/auth-service";
import { Producto } from "../../core/models/models";

describe("VentaPos Component", () => {
  const postMock = vi.fn(() => of({ id: 1, total: 13.5 }));
  const getMock = vi.fn(() => of({ content: [], totalElements: 0, totalPages: 1 }));
  const patchMock = vi.fn(() => of({ id: 5, nombre: "Ana Torres", documento: "72849102", activo: true }));
  const apiMock = { get: getMock, post: postMock, patch: patchMock };
  const authMock = { tiene: vi.fn((role: string) => role === "ADMIN"), roles: () => ["ADMIN"] };

  beforeEach(() => {
    postMock.mockReset().mockReturnValue(of({ id: 1, total: 13.5 }));
    getMock.mockReset().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 1 }));
    patchMock.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
  });

  const dummyProd1: Producto = {
    id: 10,
    codigo: "P001",
    codigoBarras: "7751234567890",
    nombre: "Leche evaporada 400 g",
    categoria: { id: 1, nombre: "Lácteos" },
    precio: 4.5,
    stock: 25,
  };

  const dummyProd2: Producto = {
    id: 20,
    codigo: "P002",
    codigoBarras: "7759876543210",
    nombre: "Arroz 1 kg",
    categoria: { id: 2, nombre: "Abarrotes" },
    precio: 4.5,
    stock: 5,
  };

  it("agrega productos al carrito, incrementa cantidad y calcula el total", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());

    pos.agregarAlCarrito(dummyProd1);
    expect(pos.cart().length).toBe(1);
    expect(pos.totalVenta()).toBe(4.5);

    // Incrementar cantidad
    pos.cambiarCantidad(10, 1);
    expect(pos.cart()[0].cantidad).toBe(2);
    expect(pos.totalVenta()).toBe(9.0);

    // Agregar segundo producto
    pos.agregarAlCarrito(dummyProd2);
    expect(pos.cart().length).toBe(2);
    expect(pos.totalUnidades()).toBe(3);
    expect(pos.totalVenta()).toBe(13.5);
  });

  it("permite editar cantidades directamente y quita producto si se fija en 0", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    pos.agregarAlCarrito(dummyProd1);

    pos.fijarCantidad(10, 5);
    expect(pos.cart()[0].cantidad).toBe(5);
    expect(pos.totalVenta()).toBe(22.5);

    // Si supera el stock, se ajusta al máximo disponible
    pos.fijarCantidad(10, 999);
    expect(pos.cart()[0].cantidad).toBe(25);
    expect(pos.error()).toContain("Stock máximo alcanzado");

    // Si se fija en 0 o inválido, quita del carrito
    pos.fijarCantidad(10, 0);
    expect(pos.cart().length).toBe(0);
  });

  it("el escáner de código de barras agrega producto, limpia el campo para el siguiente y no confirma la venta", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    pos.catalogo.set([dummyProd1, dummyProd2]);
    pos.searchQuery = "7751234567890";
    pos.onSearchInput();

    const preventDefaultSpy = vi.fn();
    const event = { key: "Enter", preventDefault: preventDefaultSpy } as any;

    pos.onSearchKeyDown(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(pos.cart().length).toBe(1);
    expect(pos.cart()[0].productoId).toBe(10);
    expect(pos.searchQuery).toBe(""); // Limpio para el próximo escaneo

    // Escaneo repetido incrementa la cantidad
    pos.searchQuery = "7751234567890";
    pos.onSearchInput();
    pos.onSearchKeyDown(event);
    expect(pos.cart().length).toBe(1);
    expect(pos.cart()[0].cantidad).toBe(2);
  });

  it("calcula vuelto correctamente según efectivo recibido", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());

    pos.agregarAlCarrito(dummyProd1);
    pos.cambiarCantidad(10, 1); // 2 * 4.5 = 9.0
    pos.agregarAlCarrito(dummyProd2); // + 4.5 = 13.5

    pos.seleccionarMetodoPago("EFECTIVO");
    pos.setEfectivo(20.0);

    expect(pos.totalVenta()).toBe(13.5);
    expect(pos.vuelto()).toBe(6.5);
    expect(pos.pagoValido()).toBe(true);
  });

  it("para pagos con tarjeta o Yape no exige efectivo y el vuelto es 0", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    pos.agregarAlCarrito(dummyProd1);

    pos.seleccionarMetodoPago("TARJETA");
    expect(pos.vuelto()).toBe(0);
    expect(pos.pagoValido()).toBe(true);

    pos.seleccionarMetodoPago("YAPE");
    expect(pos.vuelto()).toBe(0);
    expect(pos.pagoValido()).toBe(true);
  });

  it("busca automáticamente al cliente por DNI de 8 dígitos y asigna datos", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    getMock.mockReturnValue(
      of({
        content: [{ id: 5, nombre: "Ana Torres", documento: "72849102", activo: true }],
      }) as any
    );

    // Al ingresar los 8 dígitos, sin Enter
    pos.onDniInput("72849102");
    expect(getMock).toHaveBeenCalledWith("/clientes/buscar", { q: "72849102" });
    expect(pos.clienteId()).toBe(5);
    expect(pos.clienteNombre).toBe("Ana Torres");
    expect(pos.clienteInactivoInfo()).toBeNull();
  });

  it("si se modifica el DNI limpia la vinculación previa inmediatamente", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    getMock.mockReturnValue(
      of({
        content: [{ id: 5, nombre: "Ana Torres", documento: "72849102", activo: true }],
      }) as any
    );
    pos.onDniInput("72849102");
    expect(pos.clienteId()).toBe(5);

    // Modifica quitando un dígito
    pos.onDniInput("7284910");
    expect(pos.clienteId()).toBeNull();
  });

  it("consulta APIsPerú al no encontrar un cliente y autocompleta el nombre", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    postMock.mockReturnValue(of({ nombres: "ANA MARIA", apellidoPaterno: "PRUEBA", apellidoMaterno: "EJEMPLO" }) as any);
    pos.onDniInput("00000001");
    expect(postMock).toHaveBeenCalledWith("/clientes/consulta-dni", { dni: "00000001" });
    expect(pos.plantillaClienteNombre).toBe("ANA MARIA PRUEBA EJEMPLO");
    expect(pos.clienteId()).toBeNull();
    expect(pos.buscandoCliente()).toBe(false);
  });

  it("prioriza el cliente local sin consultar una API externa", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    getMock.mockReturnValue(of({ content: [{id: 9, documento: "00000001", nombre: "Cliente local", activo: true}] }) as any);
    pos.onDniInput("00000001");
    expect(pos.clienteId()).toBe(9);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("permite el ingreso manual si APIsPerú falla", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    postMock.mockReturnValue(throwError(() => ({ status: 503 })) as any);
    pos.onDniInput("00000001");
    expect(pos.consultaDniInfo()).toContain("manualmente");
    expect(pos.buscandoCliente()).toBe(false);
    pos.plantillaClienteNombre = "Nombre manual";
    expect(pos.clienteNombre).toBe("Nombre manual");
  });

  it("no sobrescribe un nombre escrito mientras se espera la consulta", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    const pending = new Subject<any>();
    postMock.mockReturnValue(pending as any);
    pos.onDniInput("00000001");
    pos.plantillaClienteNombre = "Nombre manual";
    pending.next({nombres:"ANA", apellidoPaterno:"PRUEBA"});
    expect(pos.clienteNombre).toBe("Nombre manual");
  });

  it("cancela respuestas antiguas al borrar y volver a escribir el mismo DNI", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    const pending = new Subject<any>();
    postMock.mockReturnValue(pending as any);
    pos.onDniInput("00000001");
    pos.onDniInput("0000000");
    pending.next({nombres:"ANTIGUO", apellidoPaterno:"PRUEBA"});
    expect(pos.plantillaClienteNombre).toBe("");
    postMock.mockReturnValue(of({nombres:"NUEVO", apellidoPaterno:"PRUEBA"}) as any);
    pos.onDniInput("00000001");
    expect(pos.clienteNombre).toBe("NUEVO PRUEBA");
  });

  it("cancela la consulta al elegir consumidor final", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    const pending = new Subject<any>();
    postMock.mockReturnValue(pending as any);
    pos.onDniInput("00000001");
    pos.toggleSinDatosCliente(true);
    pending.next({nombres:"ANA", apellidoPaterno:"PRUEBA"});
    expect(pos.clienteNombre).toBe("Consumidor final");
    expect(pos.buscandoCliente()).toBe(false);
  });

  it("identifica cliente inactivo y permite reactivarlo con permiso de ADMIN", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    getMock.mockReturnValue(
      of({
        content: [{ id: 8, nombre: "Juan Inactivo", documento: "44556677", activo: false }],
      }) as any
    );

    pos.onDniInput("44556677");
    expect(pos.clienteId()).toBeNull();
    expect(pos.clienteInactivoInfo()?.id).toBe(8);

    // Al intentar confirmar con cliente inactivo, rechaza con mensaje claro
    pos.agregarAlCarrito(dummyProd1);
    pos.setEfectivo(10.0);
    pos.confirmarVenta();
    expect(pos.error()).toContain("inactivo");
    expect(postMock).not.toHaveBeenCalled();

    // Reactivar cliente
    patchMock.mockReturnValue(
      of({ id: 8, nombre: "Juan Inactivo", documento: "44556677", activo: true })
    );
    pos.reactivarClienteInactivo();
    expect(patchMock).toHaveBeenCalledWith("/clientes/8/reactivar");
    expect(pos.clienteId()).toBe(8);
    expect(pos.clienteInactivoInfo()).toBeNull();
  });

  it("envía venta con clienteId, clienteDocumento, detalles, claveOperacion y efectivoRecibido", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    pos.clienteId.set(5);
    pos.clienteDni = "72849102";
    pos.clienteNombre = "Ana Torres";
    pos.agregarAlCarrito(dummyProd1);
    pos.setEfectivo(10.0);

    pos.confirmarVenta();

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith(
      "/ventas",
      expect.objectContaining({
        clienteId: 5,
        clienteDocumento: "72849102",
        clienteTipoDocumento: "DNI",
        clienteNombre: "Ana Torres",
        detalles: [{ productoId: 10, cantidad: 1, precioEsperado: 4.5 }],
        efectivoRecibido: 10.0,
      })
    );
  });

  it("nueva venta reinicia el carrito, consumidor final y enfoca el buscador", () => {
    const pos = TestBed.runInInjectionContext(() => new VentaPos());
    pos.agregarAlCarrito(dummyProd1);
    pos.clienteDni = "72849102";
    pos.clienteId.set(5);

    pos.nuevaVenta();
    expect(pos.cart().length).toBe(0);
    expect(pos.clienteDni).toBe("");
    expect(pos.clienteId()).toBeNull();
    expect(pos.clienteNombre).toBe("Consumidor final");
    expect(pos.vista()).toBe("pos");
  });
});
