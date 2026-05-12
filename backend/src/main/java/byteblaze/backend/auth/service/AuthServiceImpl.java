package byteblaze.backend.auth.service;

import byteblaze.backend.auth.dto.AuthResponse;
import byteblaze.backend.auth.dto.LoginRequest;
import byteblaze.backend.auth.dto.RegisterRequest;
import byteblaze.backend.auth.entity.RefreshToken;
import byteblaze.backend.auth.entity.Role;
import byteblaze.backend.auth.entity.User;
import byteblaze.backend.auth.repository.UserRepository;
import byteblaze.backend.auth.util.CookieUtil;
import byteblaze.backend.auth.exception.AuthException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuthenticationManager authenticationManager;
    private final CookieUtil cookieUtil;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletResponse response) {
        if (userRepository.existsByUsername(request.username())) {
            throw new AuthException("Email already registered");
        }

         User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .username(request.username())
                .role(Role.USER)
                .build();

        user = userRepository.save(user);

        final String accessToken = jwtService.generateAccessToken(user);
        final RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        cookieUtil.addAccessTokenCookie(response, accessToken);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken());

        return buildAuthResponse(user, "Registration successful");
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new AuthException("User not found"));

        refreshTokenService.revokeAllUserTokens(user);

        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        cookieUtil.addAccessTokenCookie(response, accessToken);
        cookieUtil.addRefreshTokenCookie(response, refreshToken.getToken());

        return buildAuthResponse(user, "Login successful");
    }

    @Override
    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenValue = cookieUtil.extractCookie(request, "refresh_token");

        if (refreshTokenValue != null) {
            refreshTokenService.findByToken(refreshTokenValue)
                    .ifPresent(token -> {
                        refreshTokenService.revokeAllUserTokens(token.getUser());
                    });
        }

        cookieUtil.clearAuthCookies(response);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenValue = cookieUtil.extractCookie(request, "refresh_token");

        if (refreshTokenValue == null) {
            throw new AuthException("Refresh token not found");
        }

        RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenValue)
                .orElseThrow(() -> new AuthException("Invalid refresh token"));

        refreshTokenService.verifyExpiration(refreshToken);

        User user = refreshToken.getUser();
        String accessToken = jwtService.generateAccessToken(user);

        cookieUtil.addAccessTokenCookie(response, accessToken);

        return buildAuthResponse(user, "Token refreshed successfully");
    }

    private AuthResponse buildAuthResponse(User user, String message) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getUsername(),
                user.getRole().name(),
                message
        );
    }
}
