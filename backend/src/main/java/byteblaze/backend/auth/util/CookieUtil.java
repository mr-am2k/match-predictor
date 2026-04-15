package byteblaze.backend.auth.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    @Value("${jwt.access-token.expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpiration;

    @Value("${cookie.domain}")
    private String cookieDomain;

    @Value("${cookie.secure}")
    private boolean cookieSecure;

    @Value("${cookie.same-site}")
    private String sameSite;

    public void addAccessTokenCookie(HttpServletResponse response, String token) {
        addCookie(response, "access_token", token, "/", (int) (accessTokenExpiration / 1000));
    }

    public void addRefreshTokenCookie(HttpServletResponse response, String token) {
        addCookie(response, "refresh_token", token, "/api/v1/auth/refresh", (int) (refreshTokenExpiration / 1000));
    }

    public void clearAuthCookies(HttpServletResponse response) {
        clearCookie(response, "access_token", "/");
        clearCookie(response, "refresh_token", "/api/v1/auth/refresh");
    }

    public String extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (name.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private void addCookie(HttpServletResponse response, String name, String value, String path, int maxAge) {
        StringBuilder cookieBuilder = new StringBuilder();
        cookieBuilder.append(name).append("=").append(value);
        cookieBuilder.append("; Path=").append(path);
        cookieBuilder.append("; Max-Age=").append(maxAge);
        cookieBuilder.append("; HttpOnly");

        if (cookieSecure) {
            cookieBuilder.append("; Secure");
        }

        cookieBuilder.append("; SameSite=").append(sameSite);

        if (!"localhost".equals(cookieDomain)) {
            cookieBuilder.append("; Domain=").append(cookieDomain);
        }

        response.addHeader("Set-Cookie", cookieBuilder.toString());
    }

    private void clearCookie(HttpServletResponse response, String name, String path) {
        StringBuilder cookieBuilder = new StringBuilder();
        cookieBuilder.append(name).append("=");
        cookieBuilder.append("; Path=").append(path);
        cookieBuilder.append("; Max-Age=0");
        cookieBuilder.append("; HttpOnly");

        if (cookieSecure) {
            cookieBuilder.append("; Secure");
        }

        cookieBuilder.append("; SameSite=").append(sameSite);

        if (!"localhost".equals(cookieDomain)) {
            cookieBuilder.append("; Domain=").append(cookieDomain);
        }

        response.addHeader("Set-Cookie", cookieBuilder.toString());
    }
}
