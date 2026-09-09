export type RegistrationDraft = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  invitationToken: string | null;
  otpToken: string | null;
};

const emptyDraft = (): RegistrationDraft => ({
  firstName: "",
  lastName: "",
  phone: "",
  password: "",
  invitationToken: null,
  otpToken: null,
});

let draft = emptyDraft();

export const registrationFlow = {
  snapshot: () => draft,
  update: (values: Partial<RegistrationDraft>) => { draft = { ...draft, ...values }; },
  clear: () => { draft = emptyDraft(); },
};
