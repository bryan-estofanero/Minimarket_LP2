package pe.edu.minimarket.seguridad;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import pe.edu.minimarket.common.exception.ExternalServiceException;

class KeycloakAdminClientTest {
  MockRestServiceServer server;
  KeycloakAdminClient client;
  @BeforeEach void preparar() {
    var builder = RestClient.builder().baseUrl("https://keycloak.example.test");
    server = MockRestServiceServer.bindTo(builder).build();
    client = new KeycloakAdminClient(builder.build(), "minimarket", "servicio-test", "secreto-ficticio");
  }
  void token() {
    server.expect(requestTo("https://keycloak.example.test/realms/minimarket/protocol/openid-connect/token"))
        .andExpect(method(HttpMethod.POST))
        .andExpect(content().string(org.hamcrest.Matchers.containsString("grant_type=client_credentials")))
        .andRespond(withSuccess("{\"access_token\":\"token-ficticio\"}", MediaType.APPLICATION_JSON));
  }
  @Test void consultaRolPorContratoOficial() {
    token();
    server.expect(requestTo("https://keycloak.example.test/admin/realms/minimarket/roles/VENDEDOR"))
        .andExpect(header("Authorization", "Bearer token-ficticio"))
        .andRespond(withSuccess("{\"id\":\"r1\",\"name\":\"VENDEDOR\",\"composite\":false}", MediaType.APPLICATION_JSON));
    assertThat(client.rol("VENDEDOR")).containsEntry("name", "VENDEDOR");
    server.verify();
  }
  @Test void noFiltraErroresRemotos() {
    token();
    server.expect(requestTo("https://keycloak.example.test/admin/realms/minimarket/users?first=0&max=20"))
        .andRespond(withStatus(HttpStatus.FORBIDDEN).body("detalle privado del proveedor"));
    assertThatThrownBy(() -> client.listar(0,20)).isInstanceOf(ExternalServiceException.class)
        .hasMessageNotContaining("detalle privado");
    server.verify();
  }
  @Test void configuracionAusenteNoHaceSolicitudes() {
    var disabled = new KeycloakAdminClient(RestClient.create(), "minimarket", "", "");
    assertThatThrownBy(() -> disabled.listar(0,20)).isInstanceOf(ExternalServiceException.class);
    server.verify();
  }
}
