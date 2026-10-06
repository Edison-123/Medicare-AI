package com.medicare.service;

import com.medicare.config.JwtService;
import com.medicare.dto.AuthRequest;
import com.medicare.dto.AuthResponse;
import com.medicare.dto.UserDto;
import com.medicare.entity.User;
import com.medicare.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        UserDto userDto = new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getSub()
        );

        return new AuthResponse(userDto, token);
    }
}
