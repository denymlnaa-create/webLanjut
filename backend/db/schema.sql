-- BoysGadget database schema
-- Import file ini ke MySQL / phpMyAdmin / Laragon / XAMPP

CREATE DATABASE IF NOT EXISTS boysgadget2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE boysgadget2;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255) DEFAULT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gadgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(12, 2) DEFAULT NULL,
  release_year INT DEFAULT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  source_url VARCHAR(255) DEFAULT NULL,
  summary TEXT DEFAULT NULL,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gadgets_category (category),
  INDEX idx_gadgets_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gadget_specs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gadget_id INT NOT NULL,
  spec_key VARCHAR(100) NOT NULL,
  spec_value VARCHAR(255) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (gadget_id) REFERENCES gadgets(id) ON DELETE CASCADE,
  INDEX idx_gadget_specs_gadget (gadget_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL DEFAULT 'news',
  excerpt TEXT DEFAULT NULL,
  content LONGTEXT NOT NULL,
  cover_url VARCHAR(255) DEFAULT NULL,
  source_url VARCHAR(255) DEFAULT NULL,
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_articles_slug (slug),
  INDEX idx_articles_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS article_gadgets (
  article_id INT NOT NULL,
  gadget_id INT NOT NULL,
  PRIMARY KEY (article_id, gadget_id),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (gadget_id) REFERENCES gadgets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  like_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_posts_user (user_id),
  INDEX idx_posts_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_gadgets (
  post_id INT NOT NULL,
  gadget_id INT NOT NULL,
  PRIMARY KEY (post_id, gadget_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (gadget_id) REFERENCES gadgets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_likes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS post_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_replies_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
