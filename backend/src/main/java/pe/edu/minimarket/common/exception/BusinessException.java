package pe.edu.minimarket.common.exception;

public class BusinessException extends RuntimeException {
  public BusinessException(String message) {
    super(message);
  }
}
