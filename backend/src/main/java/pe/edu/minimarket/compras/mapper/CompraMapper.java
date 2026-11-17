package pe.edu.minimarket.compras.mapper;

import org.springframework.stereotype.Component;
import pe.edu.minimarket.compras.dto.CompraResponse;
import pe.edu.minimarket.compras.entity.Compra;

@Component
public class CompraMapper {
  public CompraResponse response(Compra v) {
    return new CompraResponse(
        v.getId(),
        v.getProveedor() == null ? null : v.getProveedor().getId(),
        v.getProveedor() == null ? "Público general" : v.getProveedor().getNombre(),
        v.getFecha(),
        v.getActor(),
        v.getEstado(),
        v.getTotal(),
        v.getDetalles().stream()
            .map(
                d ->
                    new CompraResponse.Linea(
                        d.getProductoId(),
                        d.getProductoNombre(),
                        d.getCantidad(),
                        d.getPrecioUnitario(),
                        d.getSubtotal()))
            .toList(), v.getFechaRecepcion(), v.getTipoComprobante(), v.getSerie(), v.getNumero(), v.getObservaciones());
  }
}
