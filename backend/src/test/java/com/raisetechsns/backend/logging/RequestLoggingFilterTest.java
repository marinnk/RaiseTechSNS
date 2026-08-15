package com.raisetechsns.backend.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

class RequestLoggingFilterTest {

    private final RequestLoggingFilter filter = new RequestLoggingFilter();

    @Test
    void doFilterInternal_リクエスト処理中はMDCにrequestIdが設定され_完了後にレスポンスヘッダーにも返す() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/health");
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getStatus()).thenReturn(200);
        FilterChain chain = mock(FilterChain.class);

        AtomicReference<String> requestIdDuringChain = new AtomicReference<>();
        doAnswer(invocation -> {
            requestIdDuringChain.set(MDC.get(MdcKeys.REQUEST_ID));
            return null;
        }).when(chain).doFilter(request, response);

        filter.doFilterInternal(request, response, chain);

        assertThat(requestIdDuringChain.get()).isNotBlank();
        verify(response).setHeader(eq(RequestLoggingFilter.REQUEST_ID_HEADER), anyString());
        // フィルター完了後はMDCがクリアされ、次のリクエスト（スレッド再利用時）に持ち越されない
        assertThat(MDC.get(MdcKeys.REQUEST_ID)).isNull();
    }

    @Test
    void doFilterInternal_下流で例外が発生してもMDCをクリアする() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/posts");
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getStatus()).thenReturn(500);
        FilterChain chain = mock(FilterChain.class);
        doThrow(new ServletException("boom")).when(chain).doFilter(request, response);

        assertThrows(ServletException.class, () -> filter.doFilterInternal(request, response, chain));

        assertThat(MDC.get(MdcKeys.REQUEST_ID)).isNull();
    }
}
