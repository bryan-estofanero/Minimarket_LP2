package pe.edu.minimarket.compras.dto;
import java.time.LocalDateTime;
import pe.edu.minimarket.common.dto.PageResponse;
public record ProveedorHistorial(PageResponse<CompraResponse> compras, LocalDateTime ultimaCompra) {}
