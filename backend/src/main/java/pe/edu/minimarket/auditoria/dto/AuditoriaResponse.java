package pe.edu.minimarket.auditoria.dto;

import java.time.LocalDateTime;

public record AuditoriaResponse(
    Long id,
    String actor,
    String accion,
    String entidad,
    Long entidadId,
    LocalDateTime fecha,
    String detalle) {}
