package pe.edu.minimarket.compras.dto;

public record ProveedorResponse(Long id, String nombre, String documento, String tipoDocumento,
    String nombreComercial, String personaContacto, String telefono, String correo, String direccion,
    boolean activo) {}
