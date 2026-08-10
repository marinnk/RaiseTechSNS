/**
 * views/profileEdit.js — S06 プロフィール編集画面
 * 自分のアイコン・自己紹介（160文字まで）を編集する。ユーザー名・メールアドレスはここでは変更しない。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};
  var esc = RTS.Utils.escapeHtml;

  var BIO_DRAFT_KEY = "profile-edit-bio";
  var _error = null;

  RTS.Views.ProfileEdit = {
    render: function () {
      var currentUser = RTS.State.getCurrentUser();
      var maxBio = RTS.State.MAX_BIO_LENGTH;

      // 画面に初めて入ったタイミング（router.jsがRTS.Draftをリセットした直後）でのみ、
      // 現在のプロフィール内容を下書きの初期値として取り込む。
      if (RTS.Draft.content[BIO_DRAFT_KEY] === undefined) {
        RTS.Draft.content[BIO_DRAFT_KEY] = currentUser.bio || "";
        _error = null;
      }
      var bioValue = RTS.Draft.content[BIO_DRAFT_KEY];
      var avatarPreview = RTS.Draft.avatarPreview || currentUser.avatarUrl;
      var errorHtml = _error ? '<div class="form-error">' + esc(_error) + "</div>" : "";

      return (
        '<div class="centered-page">' +
        '<h1 class="auth-title" style="text-align:left">プロフィールを編集</h1>' +
        errorHtml +
        '<form data-action="save-profile">' +
        '<div class="avatar-edit-row">' +
        '<img class="avatar avatar-lg" src="' +
        esc(avatarPreview) +
        '" alt="アイコン">' +
        '<label class="image-picker-label">画像を選択' +
        '<input type="file" accept="image/*" data-role="avatar-image"></label>' +
        "</div>" +
        '<div class="form-field">' +
        '<label for="profile-edit-bio">自己紹介（' +
        maxBio +
        "文字まで）</label>" +
        '<textarea id="profile-edit-bio" data-role="post-content" data-draft-key="' +
        BIO_DRAFT_KEY +
        '" data-max-length="' +
        maxBio +
        '" rows="4">' +
        esc(bioValue) +
        "</textarea>" +
        RTS.Utils.charCounterHtml(BIO_DRAFT_KEY, bioValue, maxBio) +
        "</div>" +
        '<div class="form-actions-row">' +
        '<a class="btn btn-ghost" href="#/profile/' +
        currentUser.id +
        '">キャンセル</a>' +
        '<button type="submit" class="btn">保存</button>' +
        "</div>" +
        "</form>" +
        "</div>"
      );
    },

    handleEvent: function (type, action, target, event) {
      if (type === "submit" && action === "save-profile") {
        event.preventDefault();
        var currentUser = RTS.State.getCurrentUser();
        var form = target;
        var bio = form.querySelector('[data-role="post-content"]').value;
        var input = { bio: bio };
        if (RTS.Draft.avatarPreview) {
          input.avatarUrl = RTS.Draft.avatarPreview;
        }
        var result = RTS.State.updateProfile(currentUser.id, input);
        if (result.ok) {
          delete RTS.Draft.content[BIO_DRAFT_KEY];
          delete RTS.Draft.avatarPreview;
          _error = null;
          RTS.Router.navigate("#/profile/" + currentUser.id);
        } else {
          _error = result.error;
          RTS.Router.rerenderView();
        }
      }
    },
  };
})();
