CREATE TABLE IF NOT EXISTS `audio_cache` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `text_hash` varchar(64) NOT NULL,
  `text_content` text NOT NULL,
  `voice_name` varchar(50) NOT NULL,
  `speed` float NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_audio` (`text_hash`,`voice_name`,`speed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
