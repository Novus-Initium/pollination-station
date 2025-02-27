create trigger "eth_contract_webhook" after insert
on "public"."pollen" for each row
execute function "supabase_functions"."http_request"(
  'http://localhost:3000/functions/v1/ethcontract-update',
  'POST',
  json_build_object(
    'Content-Type', 'application/json',
    'Authorization', concat('Bearer ', current_setting('request.jwt.claim.anon_key', true))
  )::jsonb,
  json_build_object(
    'pollen_id', NEW.id,
    'need_id', NEW.need_id,
    'requesting_dao_id', NEW.requesting_dao_id,
    'fulfilling_dao_id', NEW.fulfilling_dao_id,
    'confidence_score', NEW.confidence_score
  )::text,
  '1000'
);