<?php
// テキスト抽出・分割のテストスクリプト

// ダミーのJina Readerから返ってくるレスポンス（HTMLやマークダウン混じり）
$extractedText = <<<HTML
Title: 意外に楽しめたルーチン二丈岳 - 福岡ドタバタ登山ブログ「ヤマログ」
URL Source: https://example.com/yamalog

<h3 id="h3-0">老化対策を意識するときがやってきた</h3><p>最近、40手前にして<strong>体の老化</strong>が著しいので、これはいかんとジョギングを始めたんですね。</p>
HTML;

// 1. タイトルの抽出
$title = '';
if (preg_match('/^Title:\s*(.*?)(?:[\r\n]+|$)/mi', $extractedText, $matches)) {
    $title = trim($matches[1]);
}
echo "抽出されたタイトル: " . $title . "\n";

// 不要な先頭のメタ情報行をクリーンアップ
$text = preg_replace('/^(Markdown Content|Title|URL Source|Published Time|Author|Source):.*?[\r\n]+/mi', '', $extractedText);
$text = trim($text);

// 2. ブロック終了タグや改行タグを事前に改行「\n」に置換
$cleanExtractedText = preg_replace('/<\/h[1-6]>|<\/p>|<\/div>|<br\s*\/?>/i', "\n", $text);
$cleanExtractedText = strip_tags($cleanExtractedText);

echo "--- クリーンアップ後のテキスト ---\n";
echo $cleanExtractedText . "\n";
echo "---------------------------------\n";

// 3. 「。」「！」「？」「.」「!」「?」の直後、または改行文字の並びで分割
$rawSentences = preg_split('/(?<=。|！|\?|？|!|…)|[\r\n]+/u', $cleanExtractedText);
$sentences = [];
$validExcludes = []; // テスト時は一旦空

echo "--- 分割された候補文 ---\n";
foreach ($rawSentences as $s) {
    $s = trim($s);
    if (empty($s)) {
        continue;
    }

    // メタデータ除外
    if (preg_match('/(title|url|source|author|published|http|markdown)/i', $s)) {
        continue;
    }

    // 見出し記号除外
    if (preg_match('/^(?:#+|\-|\*|\+)\s+/u', $s)) {
        continue;
    }

    // マークダウンクリーンアップ
    $sClean = preg_replace('/!\[.*?\]\(.*?\)/u', '', $s);
    $sClean = preg_replace('/\[(.*?)\]\(.*?\)/u', '$1', $sClean);
    $sClean = preg_replace('/[\*_#`|]/u', '', $sClean);
    $sClean = trim($sClean);

    // 文字数制限
    $len = mb_strlen($sClean, 'UTF-8');
    if ($len < 15 || $len > 120) {
        echo "[文字数NG ({$len}文字)]: {$sClean}\n";
        continue;
    }

    // 日本語チェック
    if (!preg_match('/[\x{3040}-\x{309F}\x{30A0}-\x{30FF}]/u', $sClean)) {
        echo "[日本語なしNG]: {$sClean}\n";
        continue;
    }

    // 文末記号チェック
    $lastChar = mb_substr($sClean, -1, 1, 'UTF-8');
    if (!in_array($lastChar, ['。', '！', '？', '!', '?'])) {
        echo "[文末記号NG]: {$sClean}\n";
        continue;
    }

    // 重複排除して候補に追加
    if (!in_array($sClean, $sentences)) {
        $sentences[] = $sClean;
        echo "[候補追加]: {$sClean}\n";
    }
}
echo "---------------------------------\n";

if (!empty($sentences)) {
    echo "選択された文 (ランダム1): " . $sentences[array_rand($sentences)] . "\n";
    echo "選択された文 (ランダム2): " . $sentences[array_rand($sentences)] . "\n";
} else {
    echo "候補がありませんでした。\n";
}
