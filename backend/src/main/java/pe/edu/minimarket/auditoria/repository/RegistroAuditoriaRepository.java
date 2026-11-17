package pe.edu.minimarket.auditoria.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import pe.edu.minimarket.auditoria.entity.RegistroAuditoria;

public interface RegistroAuditoriaRepository
    extends JpaRepository<RegistroAuditoria, Long>, JpaSpecificationExecutor<RegistroAuditoria> {}
