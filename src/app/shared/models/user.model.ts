export interface Profil {
    name: string | undefined;
    photo: ProfilPhoto | undefined;
    langueSelected: number | undefined;
    langueMaternelle: number | undefined;
    langues: number[] | undefined;
}

export interface ProfilPhoto {
    grande: string;
    thumbnail: string;
}

export interface ProfilStorage {
    name: string | undefined;
    photo: string | undefined;
    langueSelected: number | undefined;
    langueMaternelle: number | undefined;
    langues: number[] | undefined;
}

export interface User {
    id: string;
    email: string;
    profil: ProfilStorage | undefined;
    anonymous: boolean;
    bearer: string;
    roles: string[];
    groups: string[];
}
