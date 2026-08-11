package com.raisetechsns.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.UserMapper;

@Service
public class AuthService {

    private static final Logger LOG = LoggerFactory.getLogger(AuthService.class);
    private static final String LOGIN_FAILURE_MESSAGE = "email or password is incorrect";

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userMapper.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email is already registered");
        }
        if (userMapper.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username is already taken");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        // 会員登録画面ではユーザー名・メール・パスワードのみを入力するため、
        // 表示名は初期値としてユーザー名を設定する（後からプロフィール編集で変更可能）
        user.setDisplayName(request.username());

        // 実行するとuserにDB採番済みのidが反映される
        userMapper.insert(user);
        LOG.info("user registered: id={}", user.getId());
        return user;
    }

    public User login(String email, String rawPassword) {
        User user = userMapper.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, LOGIN_FAILURE_MESSAGE));
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, LOGIN_FAILURE_MESSAGE);
        }
        LOG.info("user logged in: id={}", user.getId());
        return user;
    }
}
