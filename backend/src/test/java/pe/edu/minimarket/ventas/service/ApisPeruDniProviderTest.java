package pe.edu.minimarket.ventas.service;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import pe.edu.minimarket.common.exception.ExternalServiceException;

class ApisPeruDniProviderTest {
  MockRestServiceServer server;
  ApisPeruDniProvider provider;
  RestClient http;

  @BeforeEach void preparar() {
    var builder = RestClient.builder().baseUrl("https://dniruc.apisperu.com/api/v1");
    server = MockRestServiceServer.bindTo(builder).build();
    http = builder.build();
    provider = new ApisPeruDniProvider(http, "token-ficticio");
  }

  void responder(String body) {
    server.expect(requestTo("https://dniruc.apisperu.com/api/v1/dni/00000001?token=token-ficticio"))
        .andExpect(method(HttpMethod.GET)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
  }

  @Test void consultaContratoYConservaCerosIniciales() {
    responder("""
        {"dni":"00000001","nombres":" ANA MARIA ","apellidoPaterno":" PRUEBA ",
         "apellidoMaterno":" EJEMPLO ","codVerifica":"0"}
        """);
    assertThat(provider.consultar("00000001"))
        .isEqualTo(new ConsultaDniProvider.Persona("ANA MARIA", "PRUEBA", "EJEMPLO"));
    server.verify();
  }

  @Test void admiteSegundoApellidoAusente() {
    responder("{\"dni\":\"00000001\",\"nombres\":\"ANA\",\"apellidoPaterno\":\"PRUEBA\"}");
    assertThat(provider.consultar("00000001").apellidoMaterno()).isEmpty();
    server.verify();
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "{\"success\":false,\"message\":\"token-ficticio\"}",
      "{\"dni\":\"00000002\",\"nombres\":\"ANA\",\"apellidoPaterno\":\"PRUEBA\"}",
      "{\"dni\":\"00000001\",\"nombres\":\"ANA\"}",
      "{\"dni\":\"00000001\",\"nombres\":123,\"apellidoPaterno\":\"PRUEBA\"}",
      "{}", "null", "no es JSON"
  })
  void rechazaErrores200YRespuestasInvalidas(String body) {
    responder(body);
    assertThatThrownBy(() -> provider.consultar("00000001"))
        .isInstanceOf(ExternalServiceException.class).hasMessageNotContaining("token-ficticio");
    server.verify();
  }

  @ParameterizedTest @ValueSource(ints = {401, 403, 404, 429, 500})
  void noExponeErroresDelProveedor(int status) {
    server.expect(anything()).andRespond(withStatus(HttpStatus.valueOf(status))
        .body("token-ficticio datos privados 00000001").contentType(MediaType.APPLICATION_JSON));
    assertThatThrownBy(() -> provider.consultar("00000001"))
        .isInstanceOf(ExternalServiceException.class).hasCause(null)
        .hasMessageNotContaining("token-ficticio").hasMessageNotContaining("00000001");
    server.verify();
  }

  @Test void manejaFalloDeRedSinExponerLaUrl() {
    server.expect(anything()).andRespond(withException(new IOException("URL con token-ficticio")));
    assertThatThrownBy(() -> provider.consultar("00000001"))
        .isInstanceOf(ExternalServiceException.class).hasCause(null).hasMessageNotContaining("token-ficticio");
    server.verify();
  }

  @Test void noConsultaSinToken() {
    var disabled = new ApisPeruDniProvider(http, "  ");
    assertThatThrownBy(() -> disabled.consultar("00000001")).isInstanceOf(ExternalServiceException.class);
    server.verify();
  }

  @ParameterizedTest @ValueSource(strings = {"123", "123456789", "abcdefgh", "12?token=x"})
  void noEnviaDniInvalido(String dni) {
    assertThatThrownBy(() -> provider.consultar(dni)).isInstanceOf(IllegalArgumentException.class);
    server.verify();
  }
}
