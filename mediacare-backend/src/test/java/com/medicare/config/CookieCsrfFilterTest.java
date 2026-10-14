package com.medicare.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CookieCsrfFilterTest {

    private final CookieCsrfFilter filter = new CookieCsrfFilter();

    @Test
    void rejectsCookieAuthenticatedWritesWithoutMatchingCsrfHeader() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setCookies(new Cookie("MC_AUTH", "auth"), new Cookie("XSRF-TOKEN", "expected"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(403, response.getStatus());
    }

    @Test
    void acceptsCookieAuthenticatedWritesWithMatchingCsrfHeader() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setCookies(new Cookie("MC_AUTH", "auth"), new Cookie("XSRF-TOKEN", "expected"));
        request.addHeader("X-XSRF-TOKEN", "expected");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
    }
}