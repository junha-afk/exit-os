-- Apply once to clear previously uploaded files from the shared demo store.
-- Financial records are removed automatically via uploaded_documents ON DELETE CASCADE.
begin;

delete from uploaded_documents
where store_id = 'mock-store-mangwon';

delete from document_request_states
where store_id = 'mock-store-mangwon';

commit;
