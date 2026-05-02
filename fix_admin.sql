INSERT INTO User_tbl (tenant_id, role_type_name, first_name, last_name, email, password_hash, status, onboarding_complete, created_at)
SELECT tenant_id, 'SuperAdmin', 'System', 'Admin', 'admin@retailchain.com',
       '$2a$11$QX8CK3byPdaeKjS/chwCDO7cRnrxzcSdpwdC..x/tCcjvVxqOvc2W',
       'Active', 1, GETUTCDATE()
FROM Tenant_tbl WHERE email = 'admin@retailchain.com';

SELECT user_id, email, role_type_name, LEN(password_hash) AS hash_len, onboarding_complete, status
FROM User_tbl;
