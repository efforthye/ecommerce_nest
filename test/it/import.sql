-- 회원 기본 정보
CREATE TABLE IF NOT EXISTS UserAccount (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- 유저 잔액 정보
CREATE TABLE IF NOT EXISTS UserBalance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT UNIQUE NOT NULL,
    balance DECIMAL(65,2) NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES UserAccount(id),
    INDEX idx_userId (userId)
);

-- 잔액 변동 이력
CREATE TABLE IF NOT EXISTS BalanceHistory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userBalanceId INT NOT NULL,
    type ENUM('CHARGE', 'USE', 'REFUND') NOT NULL,
    amount DECIMAL(65,2) NOT NULL,
    afterBalance DECIMAL(65,2) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userBalanceId) REFERENCES UserBalance(id),
    INDEX idx_userBalanceId (userBalanceId)
);

-- 쿠폰 기본 정보
CREATE TABLE IF NOT EXISTS Coupon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    amount DECIMAL(65,2) NOT NULL,
    minOrderAmount DECIMAL(65,2) NOT NULL,
    validDays INT NOT NULL,
    isFcfs BOOLEAN DEFAULT false,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_isFcfs (isFcfs)
);

-- 선착순 쿠폰 관리
CREATE TABLE IF NOT EXISTS FcfsCoupon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    couponId INT NOT NULL,
    totalQuantity INT NOT NULL,
    stockQuantity INT NOT NULL,
    startDate DATETIME NOT NULL,
    endDate DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (couponId) REFERENCES Coupon(id),
    INDEX idx_couponId (couponId),
    INDEX idx_date (startDate, endDate)
);

-- 유저별 보유 쿠폰
CREATE TABLE IF NOT EXISTS UserCoupon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    couponId INT NOT NULL,
    status ENUM('AVAILABLE', 'USED', 'EXPIRED') NOT NULL,
    expiryDate DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    usedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES UserAccount(id),
    FOREIGN KEY (couponId) REFERENCES Coupon(id),
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_expiryDate (expiryDate)
);

-- 상품 기본 정보
CREATE TABLE IF NOT EXISTS Product (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    basePrice DECIMAL(65,2) NOT NULL,
    description TEXT NOT NULL,
    isActive BOOLEAN NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_isActive (isActive),
    INDEX idx_createdAt (createdAt)
);

-- 상품 옵션 및 재고 관리
CREATE TABLE IF NOT EXISTS ProductVariant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    optionName VARCHAR(255) NOT NULL,
    stockQuantity INT NOT NULL,
    price DECIMAL(65,2) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES Product(id),
    UNIQUE KEY unq_product_option (productId, optionName),
    INDEX idx_productId (productId),
    INDEX idx_stockQuantity (stockQuantity)
);

-- 상품 이미지
CREATE TABLE IF NOT EXISTS ProductImage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    productVariantId INT,
    imageUrl VARCHAR(255) NOT NULL,
    sequence INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES Product(id),
    FOREIGN KEY (productVariantId) REFERENCES ProductVariant(id),
    INDEX idx_productId (productId),
    INDEX idx_productVariantId (productVariantId)
);

-- 주문 정보
CREATE TABLE IF NOT EXISTS `Order` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    couponId INT,
    totalAmount DECIMAL(65,2) NOT NULL,
    discountAmount DECIMAL(65,2) NOT NULL,
    finalAmount DECIMAL(65,2) NOT NULL,
    status ENUM('PENDING', 'PAID', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL,
    orderedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    paidAt DATETIME,
    FOREIGN KEY (userId) REFERENCES UserAccount(id),
    FOREIGN KEY (couponId) REFERENCES UserCoupon(id),
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_orderedAt (orderedAt)
);

-- 주문 상품 상세
CREATE TABLE IF NOT EXISTS OrderItem (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    productId INT NOT NULL,
    optionVariantId INT NOT NULL,
    quantity INT NOT NULL,
    unitPrice DECIMAL(65,2) NOT NULL,
    totalPrice DECIMAL(65,2) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES `Order`(id),
    FOREIGN KEY (productId) REFERENCES Product(id),
    FOREIGN KEY (optionVariantId) REFERENCES ProductVariant(id),
    INDEX idx_orderId (orderId),
    INDEX idx_productId (productId),
    INDEX idx_optionVariantId (optionVariantId)
);

-- 장바구니
CREATE TABLE IF NOT EXISTS UserCart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    productId INT NOT NULL,
    optionVariantId INT NOT NULL,
    quantity INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES UserAccount(id),
    FOREIGN KEY (productId) REFERENCES Product(id),
    FOREIGN KEY (optionVariantId) REFERENCES ProductVariant(id),
    INDEX idx_userId (userId),
    INDEX idx_productId (productId),
    INDEX idx_optionVariantId (optionVariantId)
);

-- 결제 정보
CREATE TABLE IF NOT EXISTS Payment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    userId INT NOT NULL,
    paymentMethod VARCHAR(255) NOT NULL,
    amount DECIMAL(65,2) NOT NULL,
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL,
    pgTransactionId VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES `Order`(id),
    FOREIGN KEY (userId) REFERENCES UserAccount(id),
    INDEX idx_orderId (orderId),
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_createdAt (createdAt)
);