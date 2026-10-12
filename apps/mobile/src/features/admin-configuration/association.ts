export type AssociationSettings = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoPath: string | null;
};

export type AssociationConfiguration = AssociationSettings & { organizationId: string };

export function validateAssociationSettings(value: AssociationSettings): AssociationSettings {
  const name = value.name.trim();
  const address = value.address.trim();
  const email = value.email.trim();
  let phone = value.phone.trim().replace(/[\s().-]/g, "");
  if (/^0[157]\d{8}$/.test(phone)) phone = `+225${phone}`;
  if (!name || name.length > 160) throw new Error("Le nom de l’association est obligatoire (160 caractères maximum).");
  if (address.length > 500) throw new Error("L’adresse ne peut pas dépasser 500 caractères.");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Le téléphone doit être un numéro international valide.");
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("L’e-mail est invalide.");
  return { name, address, phone, email, logoPath: value.logoPath };
}

export function validateLogoBytes(bytes: Uint8Array, mimeType: string): void {
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Le logo doit faire au maximum 5 Mo.");
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const valid = mimeType === "image/png"
    ? png.every((byte, index) => bytes[index] === byte)
    : mimeType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!valid) throw new Error("Choisissez une image PNG ou JPEG valide.");
}
