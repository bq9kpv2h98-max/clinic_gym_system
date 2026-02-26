-- パフォーマンス向上のためのインデックス追加

-- customers テーブル
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- visits テーブル
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON visits(customer_id);

-- sales テーブル
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

-- reservations テーブル
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);

-- point_transactions テーブル
CREATE INDEX IF NOT EXISTS idx_point_transactions_transaction_date ON point_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_point_transactions_customer_id ON point_transactions(customer_id);

-- medical_records テーブル
CREATE INDEX IF NOT EXISTS idx_medical_records_visit_date ON medical_records(visit_date);
CREATE INDEX IF NOT EXISTS idx_medical_records_customer_id ON medical_records(customer_id);
