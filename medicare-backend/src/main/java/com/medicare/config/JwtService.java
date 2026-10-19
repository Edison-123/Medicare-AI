package com.medicare.config;

import com.medicare.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${medicare.jwt.secret}")
    private String secretKey;

    @Value("${medicare.jwt.allow-unsecured:false}")
    private boolean allowUnsecuredTokens;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(User user) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        extraClaims.put("userId", user.getId());
        extraClaims.put("name", user.getName());
        extraClaims.put("version", user.getTokenVersion());
        return buildToken(extraClaims, user.getEmail());
    }

    public boolean allowsUnsecuredTokens() {
        return allowUnsecuredTokens;
    }

    public boolean isUnsecuredToken(String token) {
        if (token == null || token.split("\\.").length < 2) {
            return false;
        }

        try {
            String header = token.split("\\.")[0];
            String decodedHeader = new String(Base64.getUrlDecoder().decode(header), StandardCharsets.UTF_8);
            return decodedHeader.contains("\"alg\":\"none\"") || decodedHeader.contains("\"alg\":\"None\"");
        } catch (Exception ex) {
            return false;
        }
    }

    private String buildToken(Map<String, Object> extraClaims, String subject) {

        long now = System.currentTimeMillis();

        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(now + 30 * 60 * 1000L))
                .signWith(getSignInKey(), Jwts.SIG.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, String userEmail) {
        return isTokenValid(token, userEmail, null);
    }

    public boolean isTokenValid(String token, String userEmail, Integer tokenVersion) {
        try {
            final String username = extractUsername(token);
            if (username == null || !username.equals(userEmail) || isTokenExpired(token)) {
                return false;
            }
            if (tokenVersion != null) {
                Object tokenVersionClaim = extractClaim(token, claims -> claims.get("version"));
                return tokenVersionClaim instanceof Number number && number.intValue() == tokenVersion;
            }
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private boolean isTokenExpired(String token) {
        Date expiration = extractExpiration(token);
        return expiration != null && expiration.before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        if (isUnsecuredToken(token)) {
            if (!allowUnsecuredTokens) {
                throw new UnsupportedJwtException(
                        "Unsecured JWT tokens are disabled by default. Set medicare.jwt.allow-unsecured=true for local-only testing.");
            }

            return Jwts.parser()
                    .unsecured()
                    .build()
                    .parseUnsecuredClaims(token)
                    .getPayload();
        }

        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("medicare.jwt.secret must be configured.");
        }

        try {
            byte[] keyBytes = Decoders.BASE64.decode(secretKey);
            if (keyBytes.length >= 32) {
                return Keys.hmacShaKeyFor(keyBytes);
            }
        } catch (Exception ignored) {
            // Plain-text secrets are allowed for local development; hash them to a valid
            // 256-bit key.
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(secretKey.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable in this runtime.", e);
        }
    }
}
