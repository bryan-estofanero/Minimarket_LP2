package pe.edu.minimarket;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTests {
  @Test
  void modulosRespetanSusLimites() {
    ApplicationModules.of(MinimarketApplication.class).verify();
  }
}
