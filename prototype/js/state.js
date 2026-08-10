/**
 * state.js
 * 「疑似バックエンドAPI」。各ビューはlocalStorageを直接触らず、必ずこのRTS.State経由で
 * データを読み書きする（本実装のバックエンドAPI呼び出しに相当する境界）。
 *
 * データはlocalStorageに永続化しつつ、実行中はメモリ上にキャッシュして扱う。
 */
(function () {
  "use strict";

  var RTS = window.RTS || {};
  window.RTS = RTS;
  var U = RTS.Utils;

  var DATA_KEY = "raisetechsns_proto_v1_data";
  var SESSION_KEY = "raisetechsns_proto_v1_session";

  var MAX_CONTENT_LENGTH = 280;
  var MAX_BIO_LENGTH = 160;
  var MAX_IMAGES = 4;

  var _data = null; // { schemaVersion, users, posts, postImages, comments, likes, follows }
  var _sessionUserId = null;

  // ---- 永続化 -------------------------------------------------------
  function loadData() {
    try {
      var raw = localStorage.getItem(DATA_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== RTS.Seed.SCHEMA_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveData() {
    localStorage.setItem(DATA_KEY, JSON.stringify(_data));
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.userId ? parsed.userId : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession() {
    if (_sessionUserId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: _sessionUserId }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  // ---- 内部ヘルパー ---------------------------------------------------
  function findUser(userId) {
    return _data.users.find(function (u) {
      return u.id === userId;
    }) || null;
  }

  function sanitizeUser(user) {
    if (!user) return null;
    var copy = Object.assign({}, user);
    delete copy._mockPassword;
    return copy;
  }

  function findPostRaw(postId) {
    return _data.posts.find(function (p) {
      return p.id === postId;
    }) || null;
  }

  function imagesForPost(postId) {
    return _data.postImages
      .filter(function (pi) {
        return pi.postId === postId;
      })
      .sort(function (a, b) {
        return a.order - b.order;
      })
      .map(function (pi) {
        return pi.url;
      });
  }

  function likeCountFor(postId) {
    return _data.likes.filter(function (l) {
      return l.postId === postId;
    }).length;
  }

  function commentCountFor(postId) {
    return _data.comments.filter(function (c) {
      return c.postId === postId;
    }).length;
  }

  function isLikedByRaw(postId, userId) {
    return _data.likes.some(function (l) {
      return l.postId === postId && l.userId === userId;
    });
  }

  function isFollowingRaw(followerId, followeeId) {
    return _data.follows.some(function (f) {
      return f.followerId === followerId && f.followeeId === followeeId;
    });
  }

  function enrichPost(post, viewerUserId) {
    if (!post) return null;
    var author = sanitizeUser(findUser(post.userId));
    return {
      id: post.id,
      userId: post.userId,
      author: author,
      content: post.content,
      images: imagesForPost(post.id),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likeCount: likeCountFor(post.id),
      commentCount: commentCountFor(post.id),
      likedByMe: viewerUserId ? isLikedByRaw(post.id, viewerUserId) : false,
      isMine: viewerUserId === post.userId,
    };
  }

  function sortByCreatedAtDesc(list) {
    return list.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  // ---- 公開API --------------------------------------------------------
  RTS.State = {
    MAX_CONTENT_LENGTH: MAX_CONTENT_LENGTH,
    MAX_BIO_LENGTH: MAX_BIO_LENGTH,
    MAX_IMAGES: MAX_IMAGES,

    init: function () {
      _data = loadData();
      if (!_data) {
        _data = RTS.Seed.createSeedData();
        saveData();
      }
      _sessionUserId = loadSession();
      // セッションが指すユーザーが存在しない場合（リセット後の不整合等）はログアウト扱いにする
      if (_sessionUserId && !findUser(_sessionUserId)) {
        _sessionUserId = null;
        saveSession();
      }
    },

    resetToSeed: function () {
      _data = RTS.Seed.createSeedData();
      saveData();
      _sessionUserId = null;
      saveSession();
    },

    // ---- 認証 ----------------------------------------------------------
    getCurrentUser: function () {
      if (!_sessionUserId) return null;
      return sanitizeUser(findUser(_sessionUserId));
    },

    isLoggedIn: function () {
      return !!_sessionUserId;
    },

    /**
     * ログイン画面のデモアカウント選択UI用。パスワード等は含まない。
     */
    getAllUsers: function () {
      return _data.users.map(sanitizeUser);
    },

    login: function (email, password) {
      var normalizedEmail = String(email || "").trim().toLowerCase();
      var user = _data.users.find(function (u) {
        return u.email.toLowerCase() === normalizedEmail;
      });
      if (!user || user._mockPassword !== password) {
        return { ok: false, error: "メールアドレスまたはパスワードが正しくありません" };
      }
      _sessionUserId = user.id;
      saveSession();
      return { ok: true, user: sanitizeUser(user) };
    },

    loginAsUser: function (userId) {
      var user = findUser(userId);
      if (!user) return { ok: false, error: "ユーザーが見つかりません" };
      _sessionUserId = user.id;
      saveSession();
      return { ok: true, user: sanitizeUser(user) };
    },

    register: function (input) {
      var username = String((input && input.username) || "").trim();
      var email = String((input && input.email) || "").trim();
      var password = String((input && input.password) || "");

      if (!username || !email || !password) {
        return { ok: false, error: "ユーザー名・メールアドレス・パスワードをすべて入力してください" };
      }
      var emailTaken = _data.users.some(function (u) {
        return u.email.toLowerCase() === email.toLowerCase();
      });
      if (emailTaken) {
        return { ok: false, error: "このメールアドレスは既に登録されています" };
      }
      var usernameTaken = _data.users.some(function (u) {
        return u.username.toLowerCase() === username.toLowerCase();
      });
      if (usernameTaken) {
        return { ok: false, error: "このユーザー名は既に使われています" };
      }

      var newUser = {
        id: U.nextId(_data.users),
        username: username,
        email: email,
        _mockPassword: password,
        displayName: username,
        bio: "",
        avatarUrl: U.generateAvatarDataUri(username, username),
        createdAt: U.nowIso(),
        updatedAt: U.nowIso(),
      };
      _data.users.push(newUser);
      saveData();
      _sessionUserId = newUser.id;
      saveSession();
      return { ok: true, user: sanitizeUser(newUser) };
    },

    logout: function () {
      _sessionUserId = null;
      saveSession();
    },

    // ---- タイムライン・投稿 ----------------------------------------------
    getTimelinePosts: function (options) {
      var scope = (options && options.scope) || "all";
      var viewerUserId = options && options.viewerUserId;
      var list = _data.posts;
      if (scope === "following" && viewerUserId) {
        list = list.filter(function (p) {
          return p.userId === viewerUserId || isFollowingRaw(viewerUserId, p.userId);
        });
      }
      return sortByCreatedAtDesc(list).map(function (p) {
        return enrichPost(p, viewerUserId);
      });
    },

    getPostsByUser: function (userId, viewerUserId) {
      var list = _data.posts.filter(function (p) {
        return p.userId === userId;
      });
      return sortByCreatedAtDesc(list).map(function (p) {
        return enrichPost(p, viewerUserId);
      });
    },

    getPostById: function (postId, viewerUserId) {
      return enrichPost(findPostRaw(postId), viewerUserId);
    },

    addPost: function (userId, input) {
      var content = String((input && input.content) || "").trim();
      var imagesInput = (input && input.images) || [];
      if (!content) {
        return { ok: false, error: "投稿内容を入力してください" };
      }
      if (U.countChars(content) > MAX_CONTENT_LENGTH) {
        return { ok: false, error: "投稿は" + MAX_CONTENT_LENGTH + "文字までです" };
      }
      if (imagesInput.length > MAX_IMAGES) {
        return { ok: false, error: "画像は最大" + MAX_IMAGES + "枚までです" };
      }
      var newPost = {
        id: U.nextId(_data.posts),
        userId: userId,
        content: content,
        createdAt: U.nowIso(),
        updatedAt: U.nowIso(),
      };
      _data.posts.push(newPost);
      imagesInput.forEach(function (url, index) {
        _data.postImages.push({
          id: U.nextId(_data.postImages),
          postId: newPost.id,
          url: url,
          order: index,
        });
      });
      saveData();
      return { ok: true, post: enrichPost(newPost, userId) };
    },

    updatePost: function (postId, userId, input) {
      var post = findPostRaw(postId);
      if (!post) return { ok: false, error: "投稿が見つかりません" };
      if (post.userId !== userId) return { ok: false, error: "自分の投稿のみ編集できます" };

      var content = String((input && input.content) || "").trim();
      var imagesInput = (input && input.images) || [];
      if (!content) {
        return { ok: false, error: "投稿内容を入力してください" };
      }
      if (U.countChars(content) > MAX_CONTENT_LENGTH) {
        return { ok: false, error: "投稿は" + MAX_CONTENT_LENGTH + "文字までです" };
      }
      if (imagesInput.length > MAX_IMAGES) {
        return { ok: false, error: "画像は最大" + MAX_IMAGES + "枚までです" };
      }

      post.content = content;
      post.updatedAt = U.nowIso();
      _data.postImages = _data.postImages.filter(function (pi) {
        return pi.postId !== postId;
      });
      imagesInput.forEach(function (url, index) {
        _data.postImages.push({
          id: U.nextId(_data.postImages),
          postId: postId,
          url: url,
          order: index,
        });
      });
      saveData();
      return { ok: true, post: enrichPost(post, userId) };
    },

    deletePost: function (postId, userId) {
      var post = findPostRaw(postId);
      if (!post) return { ok: false, error: "投稿が見つかりません" };
      if (post.userId !== userId) return { ok: false, error: "自分の投稿のみ削除できます" };

      _data.posts = _data.posts.filter(function (p) {
        return p.id !== postId;
      });
      _data.postImages = _data.postImages.filter(function (pi) {
        return pi.postId !== postId;
      });
      _data.comments = _data.comments.filter(function (c) {
        return c.postId !== postId;
      });
      _data.likes = _data.likes.filter(function (l) {
        return l.postId !== postId;
      });
      saveData();
      return { ok: true };
    },

    // ---- コメント --------------------------------------------------------
    getCommentsByPost: function (postId) {
      var list = _data.comments.filter(function (c) {
        return c.postId === postId;
      });
      list = list.slice().sort(function (a, b) {
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      return list.map(function (c) {
        return {
          id: c.id,
          postId: c.postId,
          userId: c.userId,
          author: sanitizeUser(findUser(c.userId)),
          content: c.content,
          createdAt: c.createdAt,
        };
      });
    },

    addComment: function (postId, userId, content) {
      var trimmed = String(content || "").trim();
      if (!trimmed) {
        return { ok: false, error: "コメントを入力してください" };
      }
      if (U.countChars(trimmed) > MAX_CONTENT_LENGTH) {
        return { ok: false, error: "コメントは" + MAX_CONTENT_LENGTH + "文字までです" };
      }
      if (!findPostRaw(postId)) {
        return { ok: false, error: "投稿が見つかりません" };
      }
      var newComment = {
        id: U.nextId(_data.comments),
        postId: postId,
        userId: userId,
        content: trimmed,
        createdAt: U.nowIso(),
      };
      _data.comments.push(newComment);
      saveData();
      return { ok: true, comment: newComment };
    },

    deleteComment: function (commentId, userId) {
      var comment = _data.comments.find(function (c) {
        return c.id === commentId;
      });
      if (!comment) return { ok: false, error: "コメントが見つかりません" };
      if (comment.userId !== userId) return { ok: false, error: "自分のコメントのみ削除できます" };
      _data.comments = _data.comments.filter(function (c) {
        return c.id !== commentId;
      });
      saveData();
      return { ok: true };
    },

    // ---- いいね ----------------------------------------------------------
    isLikedBy: function (postId, userId) {
      return isLikedByRaw(postId, userId);
    },

    getLikeCount: function (postId) {
      return likeCountFor(postId);
    },

    toggleLike: function (postId, userId) {
      if (!findPostRaw(postId)) return { ok: false, error: "投稿が見つかりません" };
      var existing = _data.likes.find(function (l) {
        return l.postId === postId && l.userId === userId;
      });
      if (existing) {
        _data.likes = _data.likes.filter(function (l) {
          return l.id !== existing.id;
        });
      } else {
        _data.likes.push({
          id: U.nextId(_data.likes),
          postId: postId,
          userId: userId,
          createdAt: U.nowIso(),
        });
      }
      saveData();
      return { ok: true, liked: !existing, likeCount: likeCountFor(postId) };
    },

    // ---- フォロー --------------------------------------------------------
    isFollowing: function (followerId, followeeId) {
      return isFollowingRaw(followerId, followeeId);
    },

    getFollowCounts: function (userId) {
      var followingCount = _data.follows.filter(function (f) {
        return f.followerId === userId;
      }).length;
      var followerCount = _data.follows.filter(function (f) {
        return f.followeeId === userId;
      }).length;
      return { followingCount: followingCount, followerCount: followerCount };
    },

    getFollowingList: function (userId) {
      return _data.follows
        .filter(function (f) {
          return f.followerId === userId;
        })
        .map(function (f) {
          return sanitizeUser(findUser(f.followeeId));
        })
        .filter(Boolean);
    },

    getFollowerList: function (userId) {
      return _data.follows
        .filter(function (f) {
          return f.followeeId === userId;
        })
        .map(function (f) {
          return sanitizeUser(findUser(f.followerId));
        })
        .filter(Boolean);
    },

    toggleFollow: function (followerId, followeeId) {
      if (followerId === followeeId) {
        return { ok: false, error: "自分自身をフォローすることはできません" };
      }
      var existing = _data.follows.find(function (f) {
        return f.followerId === followerId && f.followeeId === followeeId;
      });
      if (existing) {
        _data.follows = _data.follows.filter(function (f) {
          return f.id !== existing.id;
        });
      } else {
        _data.follows.push({
          id: U.nextId(_data.follows),
          followerId: followerId,
          followeeId: followeeId,
          createdAt: U.nowIso(),
        });
      }
      saveData();
      return { ok: true, following: !existing };
    },

    // ---- プロフィール ------------------------------------------------------
    getUserById: function (userId) {
      return sanitizeUser(findUser(userId));
    },

    updateProfile: function (userId, input) {
      var user = findUser(userId);
      if (!user) return { ok: false, error: "ユーザーが見つかりません" };
      var bio = String((input && input.bio) || "");
      if (U.countChars(bio) > MAX_BIO_LENGTH) {
        return { ok: false, error: "自己紹介は" + MAX_BIO_LENGTH + "文字までです" };
      }
      user.bio = bio;
      if (input && input.avatarUrl) {
        user.avatarUrl = input.avatarUrl;
      }
      user.updatedAt = U.nowIso();
      saveData();
      return { ok: true, user: sanitizeUser(user) };
    },

    // ---- ユーザー検索 ------------------------------------------------------
    searchUsers: function (keyword) {
      var trimmed = String(keyword || "").trim().toLowerCase();
      if (!trimmed) return [];
      return _data.users
        .filter(function (u) {
          return (
            u.username.toLowerCase().indexOf(trimmed) !== -1 ||
            u.displayName.toLowerCase().indexOf(trimmed) !== -1
          );
        })
        .map(sanitizeUser);
    },
  };
})();
