package com.medicare.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Set;

@Component
public class CookieCsrfFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!SAFE_METHODS.contains(request.getMethod()) && hasAuthCookie(request)
                && !csrfTokenMatches(request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"CSRF validation failed\",\"status\":403}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean hasAuthCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        return cookies != null && Arrays.stream(cookies).anyMatch(cookie -> "MC_AUTH".equals(cookie.getName()));
    }

    private boolean csrfTokenMatches(HttpServletRequest request) {
        String cookieToken = null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("XSRF-TOKEN".equals(cookie.getName())) {
                    cookieToken = cookie.getValue();
                    break;
                }
            }
        }
        String headerToken = request.getHeader("X-XSRF-TOKEN");
        return cookieToken != null && headerToken != null
                && MessageDigest.isEqual(cookieToken.getBytes(StandardCharsets.UTF_8),
                        headerToken.getBytes(StandardCharsets.UTF_8));
    }
}