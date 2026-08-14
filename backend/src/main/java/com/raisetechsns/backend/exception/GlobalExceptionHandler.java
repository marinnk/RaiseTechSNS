package com.raisetechsns.backend.exception;

import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * どのコントローラーで例外が発生しても、レスポンスの形（ProblemDetail）を統一するための受け皿。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail handleResponseStatusException(ResponseStatusException ex) {
        return ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }

    /**
     * アップロードファイルが{@code spring.servlet.multipart.max-file-size}を超えた場合にSpring MVCが
     * 投げる例外。{@link ResponseStatusException}ではないため、このハンドラーが無いと
     * {@link #handleUnexpectedException}に落ちて500になってしまう。
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "uploaded file is too large");
    }

    /**
     * {@code Content-Type}が{@code @RequestMapping}の{@code consumes}と合わない場合にSpring MVCが
     * 投げる例外（例：投稿の作成・編集はmultipart/form-data専用だが、application/jsonで送られた場合）。
     * {@link ResponseStatusException}ではないため、このハンドラーが無いと
     * {@link #handleUnexpectedException}に落ちて415ではなく500になってしまう。
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ProblemDetail handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported content type");
    }

    /**
     * 対応するハンドラー・静的リソースが見つからない場合にSpring MVCが投げる例外
     * （例：Swagger UI・OpenAPI定義エンドポイントを{@code springdoc.*.enabled=false}で無効化した状態で
     * {@code /v3/api-docs}等にアクセスした場合）。{@link ResponseStatusException}ではないため、
     * このハンドラーが無いと{@link #handleUnexpectedException}に落ちて404ではなく500になってしまう。
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ProblemDetail handleNoResourceFoundException(NoResourceFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "resource not found");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpectedException(Exception ex) {
        LOG.error("unexpected error occurred", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "unexpected error occurred");
    }
}
