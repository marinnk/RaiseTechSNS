/**
 * views/postDetail.js — S04 投稿詳細画面
 * 投稿1件とそのコメント一覧を表示し、コメントの投稿・削除ができる。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  RTS.Views = RTS.Views || {};
  var esc = RTS.Utils.escapeHtml;

  function renderComment(c, currentUser) {
    var isMine = currentUser && c.userId === currentUser.id;
    return (
      '<div class="comment-item">' +
      '<a href="#/profile/' +
      c.author.id +
      '"><img class="avatar avatar-sm" src="' +
      esc(c.author.avatarUrl) +
      '" alt="' +
      esc(c.author.displayName) +
      'のアイコン"></a>' +
      '<div class="comment-item-body">' +
      '<div class="comment-item-header">' +
      '<span><a class="user-link" href="#/profile/' +
      c.author.id +
      '"><span class="display-name">' +
      esc(c.author.displayName) +
      '</span></a> <span class="username">@' +
      esc(c.author.username) +
      "</span></span>" +
      (isMine
        ? '<button type="button" class="btn btn-ghost btn-small" data-action="delete-comment" data-comment-id="' +
          c.id +
          '">削除</button>'
        : "") +
      "</div>" +
      '<p class="comment-content">' +
      esc(c.content).replace(/\n/g, "<br>") +
      "</p>" +
      '<div class="comment-meta">' +
      RTS.Utils.formatDateTime(c.createdAt) +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  RTS.Views.PostDetail = {
    render: function (params) {
      var postId = Number(params.id);
      var currentUser = RTS.State.getCurrentUser();
      var post = RTS.State.getPostById(postId, currentUser.id);

      if (!post) {
        return (
          '<div class="back-link-bar"><a href="#/timeline">← タイムラインに戻る</a></div>' +
          '<p class="empty-state">投稿が見つかりませんでした。削除された可能性があります。</p>'
        );
      }

      var comments = RTS.State.getCommentsByPost(postId);
      var commentsHtml =
        comments.length > 0
          ? comments
              .map(function (c) {
                return renderComment(c, currentUser);
              })
              .join("")
          : '<p class="empty-state">まだコメントがありません。最初のコメントをしてみましょう。</p>';

      var commentDraftKey = "comment-" + postId;
      var commentMax = RTS.State.MAX_CONTENT_LENGTH;
      var commentValue = RTS.Draft.content[commentDraftKey] || "";

      return (
        '<div class="back-link-bar"><a href="#/timeline">← タイムラインに戻る</a></div>' +
        '<div class="post-detail">' +
        RTS.Components.PostCard.render(post, { linkToDetail: false }) +
        "</div>" +
        '<div class="comments-section">' +
        "<h2>コメント</h2>" +
        commentsHtml +
        "</div>" +
        '<form class="comment-form" data-action="create-comment" data-post-id="' +
        postId +
        '">' +
        '<img class="avatar avatar-sm" src="' +
        esc(currentUser.avatarUrl) +
        '" alt="">' +
        '<div class="comment-form-body">' +
        '<textarea data-role="post-content" data-draft-key="' +
        commentDraftKey +
        '" data-max-length="' +
        commentMax +
        '" rows="2" placeholder="コメントを入力">' +
        esc(commentValue) +
        "</textarea>" +
        RTS.Utils.charCounterHtml(commentDraftKey, commentValue, commentMax) +
        '<div class="form-actions-row"><button type="submit" class="btn btn-small">コメントする</button></div>' +
        "</div>" +
        "</form>"
      );
    },

    handleEvent: function (type, action, target, event) {
      if (type === "submit" && action === "create-comment") {
        event.preventDefault();
        var form = target;
        var postId = Number(form.getAttribute("data-post-id"));
        var currentUser = RTS.State.getCurrentUser();
        var textarea = form.querySelector('[data-role="post-content"]');
        var result = RTS.State.addComment(postId, currentUser.id, textarea.value);
        if (result.ok) {
          delete RTS.Draft.content["comment-" + postId];
          RTS.Router.rerenderView();
        } else {
          alert(result.error);
        }
      }
    },
  };
})();
