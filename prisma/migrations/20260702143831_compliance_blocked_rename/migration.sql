-- Data migration: the manual compliance block was historically stored under
-- the misleading category COMPLIANCE_REVIEW_TIMEOUT. Rename existing rows to
-- COMPLIANCE_BLOCKED to match the write path and UI.
UPDATE "PaymentRequest"
SET "exceptionCategory" = 'COMPLIANCE_BLOCKED'
WHERE "exceptionCategory" = 'COMPLIANCE_REVIEW_TIMEOUT';
