export interface Competition {
  id: number;
  name: string;
  logoUrl: string | null;
  countryName: string | null;
  countryFlagUrl: string | null;
  seasonYear: number;
  seasonStart: string | null;
  seasonEnd: string | null;
}
