/**
 * views/login.js — S01 ログイン画面
 * 実際のパスワード検証はモックだが、シードユーザー共通パスワードでの
 * ログイン体験と、ワンクリックで試せるデモアカウント選択を用意する。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};
  var esc = RTS.Utils.escapeHtml;

  var _error = null;

  function renderDemoAccounts() {
    var users = RTS.State.getAllUsers();
    return users
      .map(function (u) {
        return (
          '<div class="demo-account-item">' +
          '<span class="user-link">' +
          '<img class="avatar avatar-sm" src="' +
          esc(u.avatarUrl) +
          '" alt="">' +
          "<span>" +
          '<span class="display-name">' +
          esc(u.displayName) +
          "</span> " +
          '<span class="username">@' +
          esc(u.username) +
          "</span>" +
          "</span>" +
          "</span>" +
          '<button type="button" class="btn btn-outline btn-small" data-action="quick-login" data-user-id="' +
          u.id +
          '">このアカウントでログイン</button>' +
          "</div>"
        );
      })
      .join("");
  }

  RTS.Views.Login = {
    render: function () {
      var errorHtml = _error ? '<div class="form-error">' + esc(_error) + "</div>" : "";
      return (
        '<div class="centered-page">' +
        '<h1 class="auth-title">RaiseTechSNS</h1>' +
        errorHtml +
        '<form data-action="login-submit">' +
        '<div class="form-field"><label for="login-email">メールアドレス</label>' +
        '<input type="email" id="login-email" name="email" autocomplete="email" required></div>' +
        '<div class="form-field"><label for="login-password">パスワード</label>' +
        '<input type="password" id="login-password" name="password" autocomplete="current-password" required></div>' +
        '<button type="submit" class="btn btn-block">ログイン</button>' +
        "</form>" +
        '<p class="auth-switch">アカウントをお持ちでない方は <a href="#/register">新規登録はこちら</a></p>' +
        '<div class="demo-accounts">' +
        "<h2>デモ用アカウントで試す</h2>" +
        '<p class="demo-password-hint">デモ用パスワード：' +
        esc(RTS.Seed.DEMO_PASSWORD) +
        "（全アカウント共通）</p>" +
        '<div class="demo-account-list">' +
        renderDemoAccounts() +
        "</div>" +
        "</div>" +
        "</div>"
      );
    },

    handleEvent: function (type, action, target, event) {
      if (type === "submit" && action === "login-submit") {
        event.preventDefault();
        var form = target;
        var email = form.querySelector("#login-email").value;
        var password = form.querySelector("#login-password").value;
        var result = RTS.State.login(email, password);
        if (result.ok) {
          _error = null;
          RTS.Router.navigate("#/timeline");
        } else {
          _error = result.error;
          RTS.Router.rerenderView();
        }
      } else if (type === "click" && action === "quick-login") {
        var userId = Number(target.getAttribute("data-user-id"));
        RTS.State.loginAsUser(userId);
        _error = null;
        RTS.Router.navigate("#/timeline");
      }
    },
  };
})();
