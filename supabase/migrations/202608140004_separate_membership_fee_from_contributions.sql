alter function public.get_admin_member_detail(uuid, uuid)
rename to get_admin_member_detail_including_membership_fee;

create or replace function public.get_admin_member_detail(admin_id uuid, target_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  detail jsonb;
begin
  select public.get_admin_member_detail_including_membership_fee(admin_id, target_member_id)
  into detail;

  return jsonb_set(
    detail,
    '{summary,totalContributed}',
    to_jsonb(
      coalesce((detail->'summary'->>'monthlyPaid')::numeric, 0)
      + coalesce((detail->'summary'->>'exceptionalPaid')::numeric, 0)
    )
  );
end;
$$;

revoke all on function public.get_admin_member_detail_including_membership_fee(uuid, uuid) from public;
revoke all on function public.get_admin_member_detail(uuid, uuid) from public;
grant execute on function public.get_admin_member_detail(uuid, uuid) to service_role;
