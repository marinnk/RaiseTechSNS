package com.raisetechsns.backend.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.raisetechsns.backend.entity.PostImage;

/**
 * {@code post_images}テーブルへのアクセス口。実際のSQLは{@code resources/mapper/PostImageMapper.xml}に書く。
 */
@Mapper
public interface PostImageMapper {

    /**
     * 投稿を新規作成・編集する際に、画像を1件追加する。
     */
    void insert(@Param("postId") Long postId, @Param("imageUrl") String imageUrl,
            @Param("displayOrder") int displayOrder);

    /**
     * 指定した投稿の画像を表示順で取得する。
     */
    List<PostImage> findByPostId(@Param("postId") Long postId);

    /**
     * 複数の投稿の画像をまとめて取得する（タイムライン等の一覧表示で、投稿件数分の
     * クエリが発生する（N+1問題）のを避けるため、ページ内の投稿idをまとめて渡す）。
     */
    List<PostImage> findByPostIds(@Param("postIds") List<Long> postIds);

    /**
     * 指定した投稿の画像をすべて削除する。編集時に「残す画像・新規画像」で表示順を
     * 振り直すため、一旦全削除してから入れ直す（{@link PostImage}は行数が少なく、
     * 個別の更新文を用意するより単純なため）。
     */
    void deleteByPostId(@Param("postId") Long postId);
}
