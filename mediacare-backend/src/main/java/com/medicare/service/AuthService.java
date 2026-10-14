package com.medicare.service;

import com.medicare.config.JwtService;
import com.medicare.dto.AuthRequest;
import com.medicare.dto.AuthResponse;
import com.medicare.dto.UserDto;
import com.medicare.entity.User;
import com.medicare.repository.UserRepository;
import com.medicare.exception.NotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
            LoginAttemptService loginAttemptService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
    }

    public AuthResponse login(AuthRequest request) {
        String email = request.getEmail().trim();
        loginAttemptService.assertAllowed(email);
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(email);
            throw new BadCredentialsException("Invalid email or password");
        }

        loginAttemptService.recordSuccess(email);
        String token = jwtService.generateToken(user);
        UserDto userDto = new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getSub());

        return new AuthResponse(userDto, token);
    }

    @Transactional
    public void logout(User authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }
}
