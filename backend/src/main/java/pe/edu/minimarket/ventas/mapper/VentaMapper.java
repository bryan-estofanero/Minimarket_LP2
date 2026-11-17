package pe.edu.minimarket.ventas.mapper;

import org.springframework.stereotype.Component;
import pe.edu.minimarket.ventas.dto.VentaResponse;
import pe.edu.minimarket.ventas.entity.Venta;

@Component
public class VentaMapper {
  public VentaResponse response(Venta v) {
    return new VentaResponse(
        v.getId(),
        v.getCliente() == null ? null : v.getCliente().getId(),
        v.getCliente() == null ? "Consumidor final" : v.getCliente().getNombre(),
        v.getFecha(),
        v.getActor(),
        v.getEstado(),
        v.getTotal(),
        v.getDetalles().stream()
            .map(
                d ->
                    new VentaResponse.Linea(
                        d.getProductoId(),
                        d.getProductoNombre(),
                        d.getCantidad(),
                        d.getPrecioUnitario(),
                        d.getSubtotal()))
            .toList(),v.getEfectivoRecibido()==null?null:"EFECTIVO",v.getEfectivoRecibido(),v.getVuelto(),v.getCajeroNombre()==null?v.getActor():v.getCajeroNombre());
  }
}
