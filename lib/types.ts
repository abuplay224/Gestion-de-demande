/** Une demande client telle que lue en base (remplacée par le type Prisma à l’étape suivante). */
export type CustomerRequest = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  subject: string;
  description: string;
  isPriority: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RequestPage = {
  items: CustomerRequest[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};
