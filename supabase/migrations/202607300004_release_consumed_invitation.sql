create function public.release_registration_invitation(invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organization_invitations
  set usage_count = usage_count - 1
  where id = invitation_id
    and usage_count > 0;

  return found;
end;
$$;

revoke all on function public.release_registration_invitation(uuid) from public;
grant execute on function public.release_registration_invitation(uuid) to service_role;
