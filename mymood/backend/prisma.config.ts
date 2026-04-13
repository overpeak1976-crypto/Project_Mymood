import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // @ts-ignore 
    url: process.env.DATABASE_URL as string,
    // @ts-ignore 
    directUrl: process.env.DIRECT_URL as string,
  },
});