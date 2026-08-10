/**
 * main.js
 * エントリポイント。State/Routerの初期化と、画面をまたいで共通の操作
 * （いいね・フォロー・投稿の編集/削除・画像選択・文字数カウンター等）のイベント委譲を行う。
 *
 * ビューは innerHTML の丸ごと差し替えで描画するため、要素ごとに addEventListener すると
 * 再描画のたびにリスナーが重複登録されてしまう。それを避けるため、document.body に対して
 * click/submit/change/input を1回だけ登録し、data-action属性を目印に委譲する。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;

  // ---- 投稿・コメント・いいね・フォローなど、複数の画面で共通のアクション ----------
  var commonHandlers = {
    logout: function () {
      RTS.State.logout();
      RTS.Router.navigate("#/login");
    },

    "reset-demo": function () {
      if (confirm("デモデータを初期状態にリセットします。よろしいですか？")) {
        RTS.State.resetToSeed();
        RTS.Router.navigate("#/login");
      }
    },

    "toggle-like": function (type, action, el) {
      var currentUser = RTS.State.getCurrentUser();
      if (!currentUser) return;
      var postId = Number(el.getAttribute("data-post-id"));
      RTS.State.toggleLike(postId, currentUser.id);
      RTS.Router.rerenderView();
    },

    "edit-post": function (type, action, el) {
      var postId = Number(el.getAttribute("data-post-id"));
      var post = RTS.State.getPostById(postId);
      if (!post) return;
      RTS.UI.editingPostId = postId;
      RTS.UI.postFormError = null;
      var key = "edit-" + postId;
      RTS.Draft.content[key] = post.content;
      RTS.Draft.images[key] = post.images.slice();
      RTS.Router.rerenderView();
    },

    "cancel-edit-post": function (type, action, el) {
      var postId = Number(el.getAttribute("data-post-id"));
      RTS.UI.editingPostId = null;
      RTS.UI.postFormError = null;
      delete RTS.Draft.content["edit-" + postId];
      delete RTS.Draft.images["edit-" + postId];
      RTS.Router.rerenderView();
    },

    "delete-post": function (type, action, el) {
      var postId = Number(el.getAttribute("data-post-id"));
      if (!confirm("この投稿を削除します。よろしいですか？")) return;
      var currentUser = RTS.State.getCurrentUser();
      var result = RTS.State.deletePost(postId, currentUser.id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      if (RTS.UI.editingPostId === postId) RTS.UI.editingPostId = null;
      var hashPath = (location.hash || "").replace(/^#/, "");
      if (hashPath.indexOf("/post/" + postId) === 0) {
        RTS.Router.navigate("#/timeline");
      } else {
        RTS.Router.rerenderView();
      }
    },

    "submit-post": function (type, action, el, event) {
      event.preventDefault();
      var form = el;
      var mode = form.getAttribute("data-mode");
      var currentUser = RTS.State.getCurrentUser();
      var key = mode === "edit" ? "edit-" + form.getAttribute("data-post-id") : "create";
      var content = form.querySelector('[data-role="post-content"]').value;
      var images = (RTS.Draft.images[key] || []).slice();

      var result;
      if (mode === "edit") {
        var postId = Number(form.getAttribute("data-post-id"));
        result = RTS.State.updatePost(postId, currentUser.id, { content: content, images: images });
      } else {
        result = RTS.State.addPost(currentUser.id, { content: content, images: images });
      }

      if (result.ok) {
        delete RTS.Draft.content[key];
        delete RTS.Draft.images[key];
        RTS.UI.postFormError = null;
        if (mode === "edit") RTS.UI.editingPostId = null;
        RTS.Router.rerenderView();
      } else {
        RTS.Draft.content[key] = content;
        RTS.UI.postFormError = { key: key, message: result.error };
        RTS.Router.rerenderView();
      }
    },

    "remove-draft-image": function (type, action, el) {
      var key = el.getAttribute("data-draft-key");
      var index = Number(el.getAttribute("data-index"));
      var images = RTS.Draft.images[key] || [];
      images.splice(index, 1);
      RTS.Draft.images[key] = images;
      RTS.Router.rerenderView();
    },

    "toggle-follow": function (type, action, el) {
      var currentUser = RTS.State.getCurrentUser();
      if (!currentUser) return;
      var followeeId = Number(el.getAttribute("data-user-id"));
      var result = RTS.State.toggleFollow(currentUser.id, followeeId);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      RTS.Router.rerenderView();
    },

    "toggle-follow-list": function (type, action, el) {
      var userId = el.getAttribute("data-user-id");
      var listType = el.getAttribute("data-type");
      var key = listType + ":" + userId;
      RTS.UI.expandedFollowLists[key] = !RTS.UI.expandedFollowLists[key];
      RTS.Router.rerenderView();
    },

    "delete-comment": function (type, action, el) {
      var commentId = Number(el.getAttribute("data-comment-id"));
      if (!confirm("このコメントを削除します。よろしいですか？")) return;
      var currentUser = RTS.State.getCurrentUser();
      var result = RTS.State.deleteComment(commentId, currentUser.id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      RTS.Router.rerenderView();
    },
  };

  function dispatchAction(type, action, el, event) {
    if (commonHandlers[action]) {
      commonHandlers[action](type, action, el, event);
      return;
    }
    var view = RTS.Router.getCurrentView();
    if (view && typeof view.handleEvent === "function") {
      view.handleEvent(type, action, el, event);
    }
  }

  // ---- 投稿・コメント・自己紹介の画像選択（複数枚、投稿本文と自己紹介の両方で共用） -----
  function handlePostImagesChange(inputEl) {
    var key = inputEl.getAttribute("data-draft-key");
    var files = Array.prototype.slice.call(inputEl.files || []);
    inputEl.value = ""; // 同じファイルを選び直しても change が発火するようにする
    if (files.length === 0) return;

    var existing = RTS.Draft.images[key] || [];
    var remainingSlots = RTS.State.MAX_IMAGES - existing.length;
    if (remainingSlots <= 0) {
      alert("画像は最大" + RTS.State.MAX_IMAGES + "枚までです");
      return;
    }
    var toProcess = files.slice(0, remainingSlots);
    if (files.length > toProcess.length) {
      alert("画像は最大" + RTS.State.MAX_IMAGES + "枚までのため、先頭の" + toProcess.length + "枚のみ追加します");
    }

    var validFiles = [];
    for (var i = 0; i < toProcess.length; i++) {
      var f = toProcess[i];
      if (f.type.indexOf("image/") !== 0) {
        alert("画像ファイルのみ選択できます：" + f.name);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        alert("画像は1枚あたり5MBまでです：" + f.name);
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length === 0) return;

    Promise.all(
      validFiles.map(function (f) {
        return RTS.Utils.readFileAsResizedDataUrl(f);
      })
    )
      .then(function (dataUrls) {
        RTS.Draft.images[key] = existing.concat(dataUrls);
        RTS.Router.rerenderView();
      })
      .catch(function (err) {
        alert("画像の読み込みに失敗しました：" + err.message);
      });
  }

  // ---- プロフィール編集画面のアイコン画像選択（1枚のみ） ------------------------------
  function handleAvatarImageChange(inputEl) {
    var files = Array.prototype.slice.call(inputEl.files || []);
    inputEl.value = "";
    if (files.length === 0) return;
    var f = files[0];
    if (f.type.indexOf("image/") !== 0) {
      alert("画像ファイルを選択してください");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("画像は5MBまでです");
      return;
    }
    RTS.Utils.readFileAsResizedDataUrl(f, 240, 0.8)
      .then(function (dataUrl) {
        RTS.Draft.avatarPreview = dataUrl;
        RTS.Router.rerenderView();
      })
      .catch(function (err) {
        alert("画像の読み込みに失敗しました：" + err.message);
      });
  }

  // ---- 投稿本文・コメント・自己紹介の文字数カウンター ---------------------------------
  // 再描画すると入力中のカーソル位置が失われるため、キー入力のたびに全体を再描画するのではなく、
  // 下書きの保存とカウンター表示の更新だけを直接DOM操作で行う。
  function handleContentInput(textareaEl) {
    var key = textareaEl.getAttribute("data-draft-key");
    if (!key) return;
    RTS.Draft.content[key] = textareaEl.value;
    var maxLength = Number(textareaEl.getAttribute("data-max-length")) || RTS.State.MAX_CONTENT_LENGTH;
    var counter = document.querySelector('[data-role="char-counter"][data-draft-key="' + key + '"]');
    if (counter) {
      var count = RTS.Utils.countChars(textareaEl.value);
      counter.textContent = count + "/" + maxLength;
      counter.classList.toggle("over-limit", count > maxLength);
    }
  }

  function bindGlobalEvents() {
    document.body.addEventListener("click", function (e) {
      var el = e.target.closest("[data-action]");
      if (!el) return;
      dispatchAction("click", el.getAttribute("data-action"), el, e);
    });

    document.body.addEventListener("submit", function (e) {
      var el = e.target.closest("[data-action]");
      if (!el) return;
      dispatchAction("submit", el.getAttribute("data-action"), el, e);
    });

    document.body.addEventListener("change", function (e) {
      var el = e.target;
      if (!el || !el.matches) return;
      if (el.matches('[data-role="post-images"]')) {
        handlePostImagesChange(el);
      } else if (el.matches('[data-role="avatar-image"]')) {
        handleAvatarImageChange(el);
      }
    });

    document.body.addEventListener("input", function (e) {
      var el = e.target;
      if (el && el.matches && el.matches('[data-role="post-content"]')) {
        handleContentInput(el);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    RTS.State.init();
    bindGlobalEvents();
    RTS.Router.init();
  });
})();
