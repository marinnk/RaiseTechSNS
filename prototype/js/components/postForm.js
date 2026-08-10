/**
 * components/postForm.js
 * 投稿の新規作成フォーム・編集フォーム。
 *
 * 入力中の本文・選択済み画像は RTS.State（永続化データ）ではなく RTS.Draft（一時状態）に
 * 保持する。いいね等の無関係な操作で画面が再描画されても、入力中の内容が消えないようにするため。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Components = RTS.Components || {};
  var esc = function (v) {
    return RTS.Utils.escapeHtml(v);
  };

  function draftContent(key) {
    return RTS.Draft.content[key] || "";
  }
  function draftImages(key) {
    return RTS.Draft.images[key] || [];
  }

  function renderError(key) {
    var err = RTS.UI.postFormError;
    if (!err || err.key !== key) return "";
    return '<div class="form-error">' + esc(err.message) + "</div>";
  }

  function renderPreviews(key) {
    var images = draftImages(key);
    return (
      '<div class="image-previews" id="previews-' +
      key +
      '">' +
      images
        .map(function (url, index) {
          return (
            '<div class="image-preview-item">' +
            '<img src="' +
            esc(url) +
            '" alt="選択中の画像">' +
            '<button type="button" class="image-preview-remove" data-action="remove-draft-image" ' +
            'data-draft-key="' +
            key +
            '" data-index="' +
            index +
            '" aria-label="この画像を削除">×</button>' +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderToolbar(key, buttonsHtml) {
    return (
      '<div class="post-form-toolbar">' +
      '<label class="image-picker-label">画像を選択（最大' +
      RTS.State.MAX_IMAGES +
      "枚）" +
      '<input type="file" accept="image/*" multiple data-role="post-images" data-draft-key="' +
      key +
      '"></label>' +
      '<div class="form-actions-row">' +
      buttonsHtml +
      "</div>" +
      "</div>"
    );
  }

  RTS.Components.PostForm = {
    /**
     * タイムライン画面の新規投稿フォーム。
     */
    renderCreateForm: function (currentUser) {
      var key = "create";
      var maxLength = RTS.State.MAX_CONTENT_LENGTH;
      return (
        '<form class="post-form" data-action="submit-post" data-mode="create">' +
        '<img class="avatar avatar-md" src="' +
        esc(currentUser.avatarUrl) +
        '" alt="' +
        esc(currentUser.displayName) +
        'のアイコン">' +
        '<div class="post-form-body">' +
        renderError(key) +
        '<textarea data-role="post-content" data-draft-key="' +
        key +
        '" data-max-length="' +
        maxLength +
        '" rows="3" placeholder="今何してる？（280文字まで）">' +
        esc(draftContent(key)) +
        "</textarea>" +
        RTS.Utils.charCounterHtml(key, draftContent(key), maxLength) +
        renderPreviews(key) +
        renderToolbar(key, '<button type="submit" class="btn">投稿</button>') +
        "</div>" +
        "</form>"
      );
    },

    /**
     * 投稿カード内の編集モードで使う編集フォーム。
     * 呼び出し前に RTS.Draft.content['edit-<id>'] / RTS.Draft.images['edit-<id>'] が
     * 初期化されている想定（main.jsのedit-postアクションハンドラで行う）。
     */
    renderEditForm: function (post) {
      var key = "edit-" + post.id;
      var maxLength = RTS.State.MAX_CONTENT_LENGTH;
      var buttons =
        '<button type="button" class="btn btn-ghost" data-action="cancel-edit-post" data-post-id="' +
        post.id +
        '">キャンセル</button>' +
        '<button type="submit" class="btn">保存</button>';
      return (
        '<form class="post-form" style="padding:0;border:none" data-action="submit-post" data-mode="edit" data-post-id="' +
        post.id +
        '">' +
        '<div class="post-form-body" style="width:100%">' +
        renderError(key) +
        '<textarea data-role="post-content" data-draft-key="' +
        key +
        '" data-max-length="' +
        maxLength +
        '" rows="3">' +
        esc(draftContent(key)) +
        "</textarea>" +
        RTS.Utils.charCounterHtml(key, draftContent(key), maxLength) +
        renderPreviews(key) +
        renderToolbar(key, buttons) +
        "</div>" +
        "</form>"
      );
    },

    renderPreviews: renderPreviews,
  };
})();
