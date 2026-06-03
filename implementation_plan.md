# 自分用メモ入力欄の追加と復習ブックマーク保存機能の実装計画

添削結果に対して「自分用メモ」を記入できるフリー入力欄（textarea）を追加し、その内容をローカルストレージ（UI状態復元用）およびMySQLデータベースの復習ブックマークデータに永続化する機能を実装します。

## ユーザーグローバルルールに基づく対応
- 会話履歴を `chat.txt` に追記します。
- 承認を待たずにそのまま実装を完了します。
- CSS編集は `css/style.scss` を編集し、コンパイルします。
- ボタンではない要素（入力欄等）には不要なhoverエフェクトを与えません。

## 提案される変更点

### 1. データベース (DB)
#### [MODIFY] [schema.sql](file:///C:/Users/OW/pj/speaking2/db/schema.sql)
- `reviews` テーブルに `memo` TEXTカラムを追加します。

#### [MODIFY] [apply_schema.php](file:///C:/Users/OW/pj/speaking2/apply_schema.php)
- 既存の `reviews` テーブルに `memo` カラムが存在しない場合、自動的に `ALTER TABLE` を実行してカラムを追加する処理を追加します。これによりサーバーへのデプロイ時もスムーズに適用できます。

### 2. バックエンド API
#### [MODIFY] [reviews.php](file:///C:/Users/OW/pj/speaking2/api/reviews.php)
- **POST (保存・更新)**: 送信されたデータオブジェクトの `memo`（最新の試行メモ）を抽出し、`reviews.memo` カラムに保存するように修正します。
- **GET (一覧取得)**: `memo` カラムもSELECTし、デコードされたJSONデータとマージしてフロントエンドに返却します。

### 3. フロントエンド UI & テンプレート
#### [MODIFY] [index.php](file:///C:/Users/OW/pj/speaking2/index.php)
- `tmpl-conversation` 内の `feedback-content`（練習モードの添削結果エリア）と `feedback-section`（通常会話の添削結果エリア）の内部に、自分用メモを記述できる `<div class="user-memo-section">` を追加します。

#### [MODIFY] [style.scss](file:///C:/Users/OW/pj/speaking2/css/style.scss)
- メモセクション（`.user-memo-section`）および入力テキストエリア（`.user-memo-input`）のレイアウトとデザインを追加します。全体のアクティブなニューモーフィズムスタイルに調和させます。

### 4. フロントエンド Logic (JavaScript)
#### [MODIFY] [app.js](file:///C:/Users/OW/pj/speaking2/js/app.js)
- `setupUserMemo(textarea, historyItem, onUpdate)` ヘルパー関数を新規作成。メモ入力の変更を検知して履歴オブジェクトの `memo` プロパティを更新し、サーバーへの非同期同期（お気に入り登録済みの場合）および `saveUIState` を呼び出すイベントをバインドします。
- 添削結果が生成されて描画された直後のタイミング（初回および再挑戦）で `setupUserMemo` をバインドします。
- `renderHistory`（過去の添削履歴を表示する関数）にメモ欄を追加し、それぞれの過去 of 試行に対してメモの編集を可能にします。
- `saveUIState` / `restoreUIState` を更新し、初回添削結果のメモも正しく一時シリアライズ・復旧できるようにします。
- リロード時に `practiceRetryHistory` が空になってしまう既存バグを修正します（`restoreUIState` で `retry_history` を `addConversationItem` に引き渡す）。

## 検証計画
- `apply_schema.php` を実行し、DBに `memo` カラムが正常に追加されることを確認。
- 練習送信後に添削結果が表示され、「自分用メモ」欄にテキストを入力できること、およびリロードしても入力内容が保持されることを確認。
- 保存（ブックマーク）ボタンを押して、サーバーに保存されること、およびDBの `reviews` テーブルで `memo` カラムと `content` JSON内の履歴にメモが正しく保存されていることを確認。
- 復習タブなどで過去の添削を表示した際、入力したメモが表示され、再度そこから編集・更新できることを確認。
- Sassのコンパイルが正常に通ることを確認。
