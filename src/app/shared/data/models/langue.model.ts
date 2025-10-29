export type Langue = {
    id: number;
    name: string;
    iso: string;
    genders: Gender[];
};

export interface Gender {
    id: number;
    name: string;
}
