package pe.edu.minimarket.ventas.service;

import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import pe.edu.minimarket.common.exception.ExternalServiceException;

/** Contrato: https://dniruc.apisperu.com/doc/swagger.
 * El proveedor exige token en query; nunca registrar la URL ni errores remotos.
 */
@Component
public class ApisPeruDniProvider implements ConsultaDniProvider {
  private static final String NO_DISPONIBLE =
      "Consulta DNI no disponible. Ingrese nombres y apellidos manualmente.";
  private static final ParameterizedTypeReference<Map<String, Object>> RESPONSE =
      new ParameterizedTypeReference<>() {};
  private final RestClient http;
  private final String token;

  @Autowired
  public ApisPeruDniProvider(@Value("${minimarket.apisperu.token:}") String token) {
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(5));
    this.http = RestClient.builder()
        .baseUrl("https://dniruc.apisperu.com/api/v1")
        .requestFactory(factory).build();
    this.token = token.trim();
  }

  ApisPeruDniProvider(RestClient http, String token) {
    this.http = http;
    this.token = token.trim();
  }

  @Override
  public Persona consultar(String dni) {
    if (dni == null || !dni.matches("[0-9]{8}"))
      throw new IllegalArgumentException("El DNI debe tener exactamente 8 dígitos.");
    if (token.isBlank()) throw new ExternalServiceException(NO_DISPONIBLE);
    try {
      var data = http.get()
          .uri(builder -> builder.path("/dni/{numero}")
              .queryParam("token", "{token}").build(dni, token))
          .accept(MediaType.APPLICATION_JSON).retrieve().body(RESPONSE);
      // APIsPerú también devuelve errores con HTTP 200 y success=false.
      if (data == null || (data.containsKey("success") && !Boolean.TRUE.equals(data.get("success")))
          || !dni.equals(data.get("dni"))) throw new ExternalServiceException(NO_DISPONIBLE);
      var nombres = texto(data, "nombres");
      var paterno = texto(data, "apellidoPaterno");
      var materno = texto(data, "apellidoMaterno");
      if (nombres.isBlank() || paterno.isBlank()) throw new ExternalServiceException(NO_DISPONIBLE);
      return new Persona(nombres, paterno, materno);
    } catch (RestClientException e) {
      // Sin causa: el mensaje de RestClient puede incluir DNI, token y cuerpo remoto.
      throw new ExternalServiceException(NO_DISPONIBLE);
    }
  }

  private static String texto(Map<String, Object> data, String key) {
    return data.get(key) instanceof String value ? value.trim() : "";
  }
}
