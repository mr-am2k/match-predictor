package byteblaze.backend.auth.service;

import byteblaze.backend.auth.dto.AuthResponse;
import byteblaze.backend.auth.dto.LoginRequest;
import byteblaze.backend.auth.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request, HttpServletResponse response);

    AuthResponse login(LoginRequest request, HttpServletResponse response);

    void logout(HttpServletRequest request, HttpServletResponse response);

    AuthResponse refreshToken(HttpServletRequest request, HttpServletResponse response);
}
