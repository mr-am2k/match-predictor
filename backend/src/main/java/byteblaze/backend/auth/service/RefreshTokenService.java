package byteblaze.backend.auth.service;

import byteblaze.backend.auth.entity.RefreshToken;
import byteblaze.backend.auth.entity.User;

import java.util.Optional;

public interface RefreshTokenService {

    RefreshToken createRefreshToken(User user);

    Optional<RefreshToken> findByToken(String token);

    RefreshToken verifyExpiration(RefreshToken token);

    void revokeToken(RefreshToken token);

    void revokeAllUserTokens(User user);
}
