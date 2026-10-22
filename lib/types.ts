import type { CustomerRequest } from "@/generated/prisma/client";

/** Une demande client, type issu du client Prisma généré. */
export type { CustomerRequest };

export type RequestPage = {
  items: CustomerRequest[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};
