package com.raisetechsns.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.raisetechsns.backend.dto.RegisterRequest;
import com.raisetechsns.backend.entity.User;
import com.raisetechsns.backend.mapper.UserMapper;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private static User user(long id, String email, String passwordHash) {
        User user = new User();
        user.setId(id);
        user.setUsername("taro");
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setDisplayName("taro");
        return user;
    }

    @Test
    void register_未登録のメールアドレスとユーザー名なら登録できる() {
        var request = new RegisterRequest("taro", "taro@example.com", "password1");
        when(userMapper.existsByEmail("taro@example.com")).thenReturn(false);
        when(userMapper.existsByUsername("taro")).thenReturn(false);
        when(passwordEncoder.encode("password1")).thenReturn("hashed");
        // MyBatisのinsert()は戻り値を返さず、実行するとuseGeneratedKeysにより
        // 渡したUserオブジェクト自体にIDがセットされる。ここではその挙動を再現する。
        doAnswer(invocation -> {
            User inserted = invocation.getArgument(0);
            inserted.setId(1L);
            return null;
        }).when(userMapper).insert(any(User.class));

        User saved = authService.register(request);

        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getUsername()).isEqualTo("taro");
        assertThat(saved.getEmail()).isEqualTo("taro@example.com");
        assertThat(saved.getPasswordHash()).isEqualTo("hashed");
        // 会員登録画面では表示名を入力しないため、初期値としてユーザー名が使われる
        assertThat(saved.getDisplayName()).isEqualTo("taro");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userMapper).insert(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("taro@example.com");
    }

    @Test
    void register_メールアドレスが登録済みならCONFLICTになる() {
        var request = new RegisterRequest("taro", "taro@example.com", "password1");
        when(userMapper.existsByEmail("taro@example.com")).thenReturn(true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> authService.register(request));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void register_ユーザー名が登録済みならCONFLICTになる() {
        var request = new RegisterRequest("taro", "taro@example.com", "password1");
        when(userMapper.existsByEmail("taro@example.com")).thenReturn(false);
        when(userMapper.existsByUsername("taro")).thenReturn(true);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> authService.register(request));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void login_正しいメールアドレスとパスワードならログインできる() {
        User existing = user(1L, "taro@example.com", "hashed");
        when(userMapper.findByEmail("taro@example.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("password1", "hashed")).thenReturn(true);

        User result = authService.login("taro@example.com", "password1");

        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    void login_メールアドレスが存在しなければUNAUTHORIZEDになる() {
        when(userMapper.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> authService.login("unknown@example.com", "password1"));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_パスワードが誤っていればUNAUTHORIZEDになる() {
        User existing = user(1L, "taro@example.com", "hashed");
        when(userMapper.findByEmail("taro@example.com")).thenReturn(Optional.of(existing));
        when(passwordEncoder.matches("wrong-password", "hashed")).thenReturn(false);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class, () -> authService.login("taro@example.com", "wrong-password"));

        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
