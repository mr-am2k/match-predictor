package byteblaze.backend.auth.service;

import org.springframework.security.core.userdetails.UserDetails;

public interface JwtService {

    String generateAccessToken(UserDetails userDetails);

    String extractUsername(String token);

    boolean isTokenValid(String token, UserDetails userDetails);
}
