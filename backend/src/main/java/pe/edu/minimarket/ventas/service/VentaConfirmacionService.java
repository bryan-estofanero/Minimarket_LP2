package pe.edu.minimarket.ventas.service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import pe.edu.minimarket.ventas.dto.*;
/** Sin transacción exterior: consulta el resultado solo después del rollback del intento concurrente. */
@Service @RequiredArgsConstructor
public class VentaConfirmacionService {
 private final VentaService ventas;
 public VentaResponse confirmar(VentaRequest r,String actor,String cajero){
  try{return ventas.crear(r,actor,cajero);}
  catch(DataIntegrityViolationException e){return ventas.repetida(r,actor).orElseThrow(()->e);}
 }
}
