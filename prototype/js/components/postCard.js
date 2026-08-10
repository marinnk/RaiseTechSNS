/**
 * components/postCard.js
 * 投稿1件分のカード。タイムライン・投稿詳細・プロフィールの投稿一覧で共用する。
 * 自分の投稿を編集中の場合は、本文の代わりに postForm（編集モード）を差し込む。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Components = RTS.Components || {};
  var esc = function (v) {
    return RTS.Utils.escapeHtml(v);
  };

  /**
   * @param {object} post  RTS.State.getPostById 等が返す、著者情報込みの投稿オブジェクト
   * @param {object} [options]
   * @param {boolean} [options.linkToDetail=true]  本文・画像を投稿詳細へのリンクにするか（詳細画面自身では false にする）
   */
  RTS.Components.PostCard = {
    render: function (post, options) {
      options = options || {};
      var linkToDetail = options.linkToDetail !== false;
      var author = post.author;
      var isEditing = RTS.UI.editingPostId === post.id;

      var actionsHtml = "";
      if (post.isMine && !isEditing) {
        actionsHtml =
          '<div class="post-card-actions">' +
          '<button type="button" class="btn btn-ghost btn-small" data-action="edit-post" data-post-id="' +
          post.id +
          '">編集</button>' +
          '<button type="button" class="btn btn-danger btn-small" data-action="delete-post" data-post-id="' +
          post.id +
          '">削除</button>' +
          "</div>";
      }

      var bodyHtml;
      if (isEditing) {
        bodyHtml = RTS.Components.PostForm.renderEditForm(post);
      } else {
        bodyHtml = RTS.Components.PostCard._renderContent(post, linkToDetail);
      }

      return (
        '<article class="post-card" data-post-id="' +
        post.id +
        '">' +
        '<a href="#/profile/' +
        author.id +
        '" aria-label="' +
        esc(author.displayName) +
        'のプロフィール">' +
        '<img class="avatar avatar-md" src="' +
        esc(author.avatarUrl) +
        '" alt="' +
        esc(author.displayName) +
        'のアイコン">' +
        "</a>" +
        '<div class="post-card-body">' +
        '<div class="post-card-header">' +
        '<div class="post-card-header-left">' +
        '<a class="user-link" href="#/profile/' +
        author.id +
        '"><span class="display-name">' +
        esc(author.displayName) +
        "</span></a>" +
        '<span class="username">@' +
        esc(author.username) +
        "</span>" +
        '<span class="post-card-meta">・' +
        RTS.Utils.formatDateTime(post.createdAt) +
        (post.updatedAt !== post.createdAt ? "（編集済み）" : "") +
        "</span>" +
        "</div>" +
        actionsHtml +
        "</div>" +
        bodyHtml +
        "</div>" +
        "</article>"
      );
    },

    _renderContent: function (post, linkToDetail) {
      var contentHtml = '<p class="post-content">' + esc(post.content).replace(/\n/g, "<br>") + "</p>";
      var imagesHtml = "";
      if (post.images && post.images.length > 0) {
        imagesHtml =
          '<div class="post-images count-' +
          post.images.length +
          '">' +
          post.images
            .map(function (url) {
              return '<img src="' + esc(url) + '" alt="投稿画像">';
            })
            .join("") +
          "</div>";
      }

      var mainHtml = contentHtml + imagesHtml;
      if (linkToDetail) {
        mainHtml = '<a class="post-content-link" href="#/post/' + post.id + '">' + mainHtml + "</a>";
      }

      var likeBtnClass = "stat-btn like-btn" + (post.likedByMe ? " liked" : "");
      var statsHtml =
        '<div class="post-stats">' +
        '<button type="button" class="' +
        likeBtnClass +
        '" data-action="toggle-like" data-post-id="' +
        post.id +
        '" aria-pressed="' +
        (post.likedByMe ? "true" : "false") +
        '">' +
        '<span aria-hidden="true">' +
        (post.likedByMe ? "♥" : "♡") +
        "</span> いいね " +
        post.likeCount +
        "</button>" +
        '<a class="stat-btn comment-link" href="#/post/' +
        post.id +
        '">💬 コメント ' +
        post.commentCount +
        "</a>" +
        "</div>";

      return mainHtml + statsHtml;
    },
  };
})();
