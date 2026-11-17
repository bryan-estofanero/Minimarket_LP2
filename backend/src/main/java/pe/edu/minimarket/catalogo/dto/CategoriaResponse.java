package pe.edu.minimarket.catalogo.dto;

public record CategoriaResponse(
    Long id,
    String nombre,
    String descripcion,
    boolean activo,
    long cantidadProductos) {}
